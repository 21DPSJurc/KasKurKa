const express = require('express');
const router = express.Router();
const { getDB } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const { ObjectId } = require('mongodb');

// Helper function to create notifications (can be moved to a service later)
async function createNotification(db, recipientUserId, type, message, link, relatedItemId, relatedItemType) {
  try {
    const notificationsCollection = db.collection('notifications');
    await notificationsCollection.insertOne({
      userId: recipientUserId,
      type: type,
      message: message,
      link: link || null,
      isRead: false,
      createdAt: new Date(),
      relatedItemId: relatedItemId ? new ObjectId(relatedItemId) : null,
      relatedItemType: relatedItemType || null,
    });
  } catch (error) {
    console.error(`Error creating notification for user ${recipientUserId}:`, error);
  }
}

// @route   POST api/tests
// @desc    Add a new test/examination entry
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
  const { subject, eventDate, eventTime, topics, format, additionalInfo, customGroupId } = req.body;
  const errors = [];
  if (!subject || subject.trim() === '') errors.push('Mācību priekšmets ir obligāts lauks.');
  if (!eventDate) errors.push('Norises datums ir obligāts lauks.');
  else {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(eventDate) || isNaN(new Date(eventDate).getTime())) {
      errors.push('Norādītais norises datums nav korekts. Izmantojiet GGGG-MM-DD formātu.');
    }
  }
  if (eventTime && !/^\d{2}:\d{2}$/.test(eventTime)) {
    errors.push('Norādītais laiks nav korekts. Izmantojiet HH:MM formātu.');
  }
  if (!customGroupId || !ObjectId.isValid(customGroupId)) {
    errors.push('Nepieciešams norādīt derīgu grupu, kurai pievienot pārbaudes darbu.');
  }
  if (errors.length > 0) return res.status(400).json({ msg: errors[0] });

  try {
    const db = getDB();
    const testsCollection = db.collection('tests');
    const usersCollection = db.collection('users');
    const groupsCollection = db.collection('groups');

    const userCreating = await usersCollection.findOne({ _id: new ObjectId(req.user.id) });
    if (!userCreating) {
      return res.status(404).json({ msg: 'Lietotājs nav atrasts.' });
    }

    const groupObjectId = new ObjectId(customGroupId);
    const targetGroup = await groupsCollection.findOne({ _id: groupObjectId });
    if (!targetGroup) {
      return res.status(400).json({ msg: 'Norādītā grupa neeksistē.' });
    }

    if (req.user.role === 'student') {
      const enrolledIds = (userCreating.enrolledCustomGroups || []).map(id => id.toString());
      if (!enrolledIds.includes(customGroupId)) {
        return res.status(403).json({ msg: 'Jums nav tiesību pievienot pārbaudes darbu šai grupai.' });
      }
    }
    // Admin can post to any group (already checked if group exists)


    const newTest = {
      subject, eventDate: new Date(eventDate), eventTime: eventTime || '', topics: topics || '',
      format: format || '', additionalInfo: additionalInfo || '',
      userId: new ObjectId(req.user.id),
      userFirstName: req.user.firstName,
      userGroup: req.user.group,
      userStudyStartYear: req.user.studyStartYear,
      customGroupId: groupObjectId,
      createdAt: new Date(),
      updatedAt: new Date(),
      type: 'test'
    };
    const result = await testsCollection.insertOne(newTest);
    const createdTest = await testsCollection.findOne({ _id: result.insertedId });

    // Add groupName to the returned object for immediate display
    createdTest.customGroupName = targetGroup.name;

    // Create notifications for group members
    if (targetGroup.members && targetGroup.members.length > 0) {
      const notificationMessage = `Grupai '${targetGroup.name}' pievienots jauns pārbaudes darbs: "${createdTest.subject}".`;
      const notificationLink = `/homework-list`; // Or a direct link to the item view

      for (const memberId of targetGroup.members) {
        if (memberId.toString() !== req.user.id) { // Don't notify the creator
          await createNotification(
            db,
            memberId,
            'NEW_TEST',
            notificationMessage,
            notificationLink,
            createdTest._id,
            'test'
          );
        }
      }
    }

    res.status(201).json({ msg: 'Pārbaudes darbs veiksmīgi pievienots!', test: createdTest });
  } catch (err) {
    console.error('Error adding test:', err);
    res.status(500).json({ msg: 'Servera kļūda pievienojot pārbaudes darbu.' });
  }
});

// @route   GET api/tests
// @desc    Get all tests relevant to the user (upcoming, sorted by eventDate asc)
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = getDB();
    const testsCollection = db.collection('tests');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let initialMatch = {};
    if (req.user.role === 'student') {
      const enrolledCustomGroupObjectIds = (req.user.enrolledCustomGroupIds || []).map(id => new ObjectId(id));
      if (enrolledCustomGroupObjectIds.length === 0) {
        return res.json([]);
      }
      initialMatch = { customGroupId: { $in: enrolledCustomGroupObjectIds } };
    } else if (req.user.role === 'admin') {
      initialMatch = {};
    } else {
      return res.status(403).json({ msg: "Nezināma lietotāja loma." });
    }

    // No date filter here, fetch all and let frontend filter/sort initially for list view
    // initialMatch.eventDate = { $gte: today }; // Removed to show all in HomeworkList view

    const tests = await testsCollection.aggregate([
      { $match: initialMatch },
      {
        $lookup: {
          from: 'groups',
          localField: 'customGroupId',
          foreignField: '_id',
          as: 'groupInfo'
        }
      },
      { $unwind: { path: '$groupInfo', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          customGroupName: { $ifNull: ['$groupInfo.name', 'Nezināma grupa'] }
        }
      },
      { $project: { groupInfo: 0 } },
      { $sort: { eventDate: 1, createdAt: -1 } }
    ]).toArray();

    res.json(tests);
  } catch (err) {
    console.error('Error fetching tests:', err);
    res.status(500).json({ msg: 'Servera kļūda ielādējot pārbaudes darbus.' });
  }
});

// @route   GET api/tests/:id
// @desc    Get a single test item by ID
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const db = getDB();
    const testsCollection = db.collection('tests');

    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ msg: 'Nederīgs ID formāts.' });
    }
    const testId = new ObjectId(req.params.id);

    const testArray = await testsCollection.aggregate([
      { $match: { _id: testId } },
      {
        $lookup: {
          from: 'groups',
          localField: 'customGroupId',
          foreignField: '_id',
          as: 'groupInfo'
        }
      },
      { $unwind: { path: '$groupInfo', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          customGroupName: { $ifNull: ['$groupInfo.name', 'Nezināma grupa'] }
        }
      },
      { $project: { groupInfo: 0 } }
    ]).toArray();

    const test = testArray.length > 0 ? testArray[0] : null;


    if (!test) {
      return res.status(404).json({ msg: 'Pārbaudes darbs nav atrasts.' });
    }

    if (req.user.role === 'student') {
      const enrolledCustomGroupIdsStrings = req.user.enrolledCustomGroupIds || [];
      if (!test.customGroupId || !enrolledCustomGroupIdsStrings.includes(test.customGroupId.toString())) {
        return res.status(403).json({ msg: 'Jums nav tiesību skatīt šo pārbaudes darbu.' });
      }
    }
    res.json(test);
  } catch (err) {
    console.error('Error fetching single test:', err);
    if (err.name === 'BSONError') return res.status(400).json({ msg: 'Nederīgs ID formāts.' });
    res.status(500).json({ msg: 'Servera kļūda, ielādējot pārbaudes darbu.' });
  }
});

// @route   PUT api/tests/:id
// @desc    Update a test/examination entry
// @access  Private (only owner or admin)
router.put('/:id', authMiddleware, async (req, res) => {
  const { subject, eventDate, eventTime, topics, format, additionalInfo, customGroupId } = req.body;
  const testId = req.params.id;
  const errors = [];

  if (!ObjectId.isValid(testId)) {
    return res.status(400).json({ msg: 'Nederīgs pārbaudes darba ID formāts.' });
  }

  if (subject && subject.trim() === '') errors.push('Mācību priekšmets nevar būt tukšs.');
  if (eventDate) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(eventDate) || isNaN(new Date(eventDate).getTime())) {
      errors.push('Norādītais datums nav korekts. Izmantojiet GGGG-MM-DD formātu.');
    }
  }
  if (eventTime && eventTime.trim() !== '' && !/^\d{2}:\d{2}$/.test(eventTime)) {
    errors.push('Norādītais laiks nav korekts. Izmantojiet HH:MM formātu.');
  }
  if (customGroupId && !ObjectId.isValid(customGroupId)) {
    errors.push('Norādītais grupas ID nav derīgs.');
  }
  if (errors.length > 0) return res.status(400).json({ msg: errors[0] });

  try {
    const db = getDB();
    const testsCollection = db.collection('tests');
    const usersCollection = db.collection('users');
    const itemObjectId = new ObjectId(testId);

    const existingTest = await testsCollection.findOne({ _id: itemObjectId });
    if (!existingTest) {
      return res.status(404).json({ msg: 'Pārbaudes darbs nav atrasts.' });
    }

    if (existingTest.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Jums nav tiesību rediģēt šo ierakstu.' });
    }

    const updateFields = { updatedAt: new Date() };
    if (subject) updateFields.subject = subject;
    if (eventDate) updateFields.eventDate = new Date(eventDate);
    if (typeof eventTime !== 'undefined') updateFields.eventTime = eventTime;
    if (typeof topics !== 'undefined') updateFields.topics = topics;
    if (typeof format !== 'undefined') updateFields.format = format;
    if (typeof additionalInfo !== 'undefined') updateFields.additionalInfo = additionalInfo;

    if (customGroupId) {
      if (req.user.role === 'student') {
        const userCreating = await usersCollection.findOne({ _id: new ObjectId(req.user.id) });
        const enrolledIds = (userCreating.enrolledCustomGroups || []).map(id => id.toString());
        if (!enrolledIds.includes(customGroupId)) {
          return res.status(403).json({ msg: 'Jums nav tiesību pārvietot pārbaudes darbu uz šo grupu.' });
        }
      } else if (req.user.role === 'admin') {
        const groupExists = await db.collection('groups').findOne({ _id: new ObjectId(customGroupId) });
        if (!groupExists) {
          return res.status(400).json({ msg: 'Norādītā mērķa grupa neeksistē.' });
        }
      }
      updateFields.customGroupId = new ObjectId(customGroupId);
    }

    await testsCollection.updateOne(
      { _id: itemObjectId },
      { $set: updateFields }
    );

    const updatedTestArr = await testsCollection.aggregate([
      { $match: { _id: itemObjectId } },
      {
        $lookup: {
          from: 'groups',
          localField: 'customGroupId',
          foreignField: '_id',
          as: 'groupInfo'
        }
      },
      { $unwind: { path: '$groupInfo', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          customGroupName: { $ifNull: ['$groupInfo.name', 'Nezināma grupa'] }
        }
      },
      { $project: { groupInfo: 0 } }
    ]).toArray();

    res.json({ msg: 'Pārbaudes darbs veiksmīgi atjaunināts!', test: updatedTestArr[0] });

  } catch (err) {
    console.error('Error updating test:', err);
    if (err.name === 'BSONError') return res.status(400).json({ msg: 'Nederīgs ID formāts.' });
    res.status(500).json({ msg: 'Servera kļūda, atjauninot pārbaudes darbu.' });
  }
});

// @route   DELETE api/tests/:id
// @desc    Delete a test/examination entry
// @access  Private (only owner or admin)
router.delete('/:id', authMiddleware, async (req, res) => {
  const testId = req.params.id;
  try {
    if (!ObjectId.isValid(testId)) {
      return res.status(400).json({ msg: 'Nederīgs ID formāts.' });
    }
    const db = getDB();
    const testsCollection = db.collection('tests');
    const progressCollection = db.collection('userItemProgress');
    const commentsCollection = db.collection('comments');
    const notificationsCollection = db.collection('notifications');
    const itemObjectId = new ObjectId(testId);

    const testToDelete = await testsCollection.findOne({ _id: itemObjectId });
    if (!testToDelete) {
      return res.status(404).json({ msg: 'Pārbaudes darbs nav atrasts.' });
    }

    if (testToDelete.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Jums nav tiesību dzēst šo ierakstu.' });
    }

    const deleteResult = await testsCollection.deleteOne({ _id: itemObjectId });
    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({ msg: 'Pārbaudes darbs netika atrasts vai jau ir dzēsts.' });
    }

    await progressCollection.deleteMany({ itemId: itemObjectId });
    await commentsCollection.deleteMany({ itemId: itemObjectId });
    await notificationsCollection.deleteMany({ relatedItemId: itemObjectId, relatedItemType: 'test' });
    await notificationsCollection.deleteMany({ relatedItemId: itemObjectId, relatedItemType: 'comment' });


    res.json({ msg: 'Pārbaudes darbs veiksmīgi dzēsts.' });
  } catch (err) {
    console.error('Error deleting test:', err);
    res.status(500).json({ msg: 'Servera kļūda, dzēšot pārbaudes darbu.' });
  }
});

module.exports = router;