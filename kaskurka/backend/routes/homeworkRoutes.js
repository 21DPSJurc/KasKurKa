const express = require('express');
const router = express.Router();
const { getDB } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const { ObjectId } = require('mongodb');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, true);
  }
}).array('files', 5);

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

// @route   POST api/homework
// @desc    Add a new homework assignment
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ msg: 'Viens no failiem ir pārāk liels (Maks. 5MB).' });
      }
      return res.status(400).json({ msg: `Faila augšupielādes kļūda: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ msg: err.message || 'Neatļauts faila tips vai cita augšupielādes kļūda.' });
    }

    const { subject, description, dueDate, additionalInfo, links, customGroupId } = req.body;
    const errors = [];

    if (!subject || subject.trim() === '') errors.push('Mācību priekšmets ir obligāts lauks.');
    if (!description || description.trim() === '') errors.push('Detalizēts uzdevuma apraksts ir obligāts lauks.');
    if (!dueDate) errors.push('Izpildes termiņš ir obligāts lauks.');
    else {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dueDate) || isNaN(new Date(dueDate).getTime())) {
        errors.push('Norādītais datums nav korekts. Izmantojiet GGGG-MM-DD formātu.');
      }
    }
    if (!customGroupId || !ObjectId.isValid(customGroupId)) {
      errors.push('Nepieciešams norādīt derīgu grupu, kurai pievienot mājasdarbu.');
    }

    if (links && links.trim() !== '') {
      const linksArray = links.split('\n').map(link => link.trim()).filter(link => link !== '');
      for (const link of linksArray) {
        if (!link.startsWith('http://') && !link.startsWith('https://')) {
          errors.push(`Saite "${link.substring(0, 30)}..." nav korekta. Tai jāsākas ar http:// vai https://`);
          break;
        }
      }
    }
    if (errors.length > 0) return res.status(400).json({ msg: errors[0] });

    try {
      const db = getDB();
      const homeworkCollection = db.collection('homeworks');
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
          return res.status(403).json({ msg: 'Jums nav tiesību pievienot mājasdarbu šai grupai.' });
        }
      }
      // Admin can post to any group (already checked if group exists)

      const fileAttachments = req.files ? req.files.map(file => ({
        originalName: file.originalname, mimeType: file.mimetype, size: file.size,
        storageReference: `Stored in memory (transient) - ${file.originalname}` // Placeholder for actual storage
      })) : [];

      const newHomework = {
        subject, description, dueDate: new Date(dueDate), additionalInfo: additionalInfo || '',
        links: links ? links.split('\n').map(link => link.trim()).filter(link => link !== '') : [],
        fileAttachments,
        userId: new ObjectId(req.user.id),
        userFirstName: req.user.firstName,
        userGroup: req.user.group,
        userStudyStartYear: req.user.studyStartYear,
        customGroupId: groupObjectId,
        createdAt: new Date(),
        updatedAt: new Date(),
        type: 'homework'
      };
      const result = await homeworkCollection.insertOne(newHomework);
      const createdHomework = await homeworkCollection.findOne({ _id: result.insertedId });

      // Add groupName to the returned object for immediate display
      createdHomework.customGroupName = targetGroup.name;


      // Create notifications for group members
      if (targetGroup.members && targetGroup.members.length > 0) {
        const notificationMessage = `Grupai '${targetGroup.name}' pievienots jauns mājasdarbs: "${createdHomework.subject}".`;
        const notificationLink = `/homework-list`; // Or a direct link to the item if a view for that exists

        for (const memberId of targetGroup.members) {
          if (memberId.toString() !== req.user.id) { // Don't notify the creator
            await createNotification(
              db,
              memberId,
              'NEW_HOMEWORK',
              notificationMessage,
              notificationLink,
              createdHomework._id,
              'homework'
            );
          }
        }
      }

      res.status(201).json({ msg: 'Mājasdarbs veiksmīgi pievienots!', homework: createdHomework });

    } catch (err) {
      console.error('Error adding homework:', err);
      res.status(500).json({ msg: 'Servera kļūda pievienojot mājasdarbu.' });
    }
  });
});

// @route   GET api/homework
// @desc    Get all homework relevant to the user (upcoming, sorted by dueDate asc)
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = getDB();
    const homeworkCollection = db.collection('homeworks');
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
    // initialMatch.dueDate = { $gte: today }; // Removed to show all in HomeworkList view

    const homeworks = await homeworkCollection.aggregate([
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
      { $sort: { dueDate: 1, createdAt: -1 } }
    ]).toArray();

    res.json(homeworks);
  } catch (err) {
    console.error('Error fetching homework:', err);
    res.status(500).json({ msg: 'Servera kļūda ielādējot mājasdarbus.' });
  }
});

// @route   GET api/homework/:id
// @desc    Get a single homework item by ID
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const db = getDB();
    const homeworkCollection = db.collection('homeworks');

    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ msg: 'Nederīgs ID formāts.' });
    }
    const homeworkId = new ObjectId(req.params.id);

    const homeworkArray = await homeworkCollection.aggregate([
      { $match: { _id: homeworkId } },
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

    const homework = homeworkArray.length > 0 ? homeworkArray[0] : null;

    if (!homework) {
      return res.status(404).json({ msg: 'Mājasdarbs nav atrasts.' });
    }

    if (req.user.role === 'student') {
      const enrolledCustomGroupIdsStrings = req.user.enrolledCustomGroupIds || [];
      if (!homework.customGroupId || !enrolledCustomGroupIdsStrings.includes(homework.customGroupId.toString())) {
        return res.status(403).json({ msg: 'Jums nav tiesību skatīt šo mājasdarbu.' });
      }
    }
    res.json(homework);
  } catch (err) {
    console.error('Error fetching single homework:', err);
    if (err.name === 'BSONError') return res.status(400).json({ msg: 'Nederīgs ID formāts.' });
    res.status(500).json({ msg: 'Servera kļūda, ielādējot mājasdarbu.' });
  }
});


// @route   PUT api/homework/:id
// @desc    Update a homework assignment
// @access  Private (only owner or admin)
router.put('/:id', authMiddleware, async (req, res) => {
  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ msg: 'Viens no failiem ir pārāk liels (Maks. 5MB).' });
      }
      return res.status(400).json({ msg: `Faila augšupielādes kļūda: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ msg: err.message || 'Neatļauts faila tips vai cita augšupielādes kļūda.' });
    }

    const { subject, description, dueDate, additionalInfo, links, customGroupId } = req.body;
    const homeworkId = req.params.id;
    const errors = [];

    if (!ObjectId.isValid(homeworkId)) {
      return res.status(400).json({ msg: 'Nederīgs mājasdarba ID formāts.' });
    }

    if (subject && subject.trim() === '') errors.push('Mācību priekšmets nevar būt tukšs.');
    if (description && description.trim() === '') errors.push('Apraksts nevar būt tukšs.');
    if (dueDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dueDate) || isNaN(new Date(dueDate).getTime())) {
        errors.push('Norādītais datums nav korekts. Izmantojiet GGGG-MM-DD formātu.');
      }
    }
    if (customGroupId && !ObjectId.isValid(customGroupId)) {
      errors.push('Norādītais grupas ID nav derīgs.');
    }

    if (links && links.trim() !== '') {
      const linksArray = links.split('\n').map(link => link.trim()).filter(link => link !== '');
      for (const link of linksArray) {
        if (!link.startsWith('http://') && !link.startsWith('https://')) {
          errors.push(`Saite "${link.substring(0, 30)}..." nav korekta. Tai jāsākas ar http:// vai https://`);
          break;
        }
      }
    }
    if (errors.length > 0) return res.status(400).json({ msg: errors[0] });

    try {
      const db = getDB();
      const homeworkCollection = db.collection('homeworks');
      const usersCollection = db.collection('users');
      const itemObjectId = new ObjectId(homeworkId);

      const existingHomework = await homeworkCollection.findOne({ _id: itemObjectId });
      if (!existingHomework) {
        return res.status(404).json({ msg: 'Mājasdarbs nav atrasts.' });
      }

      if (existingHomework.userId.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Jums nav tiesību rediģēt šo mājasdarbu.' });
      }

      const updateFields = { updatedAt: new Date() };
      if (subject) updateFields.subject = subject;
      if (description) updateFields.description = description;
      if (dueDate) updateFields.dueDate = new Date(dueDate);
      if (typeof additionalInfo !== 'undefined') updateFields.additionalInfo = additionalInfo;
      if (typeof links !== 'undefined') updateFields.links = links ? links.split('\n').map(link => link.trim()).filter(link => link !== '') : [];

      if (customGroupId) {
        if (req.user.role === 'student') {
          const userCreating = await usersCollection.findOne({ _id: new ObjectId(req.user.id) });
          const enrolledIds = (userCreating.enrolledCustomGroups || []).map(id => id.toString());
          if (!enrolledIds.includes(customGroupId)) {
            return res.status(403).json({ msg: 'Jums nav tiesību pārvietot mājasdarbu uz šo grupu.' });
          }
        } else if (req.user.role === 'admin') {
          const groupExists = await db.collection('groups').findOne({ _id: new ObjectId(customGroupId) });
          if (!groupExists) {
            return res.status(400).json({ msg: 'Norādītā mērķa grupa neeksistē.' });
          }
        }
        updateFields.customGroupId = new ObjectId(customGroupId);
      }

      if (req.files && req.files.length > 0) {
        updateFields.fileAttachments = req.files.map(file => ({
          originalName: file.originalname, mimeType: file.mimetype, size: file.size,
          storageReference: `Stored in memory (transient) - ${file.originalname}`
        }));
      } else if (req.body.clearFiles === 'true') {
        updateFields.fileAttachments = [];
      }

      await homeworkCollection.updateOne(
        { _id: itemObjectId },
        { $set: updateFields }
      );

      const updatedHomeworkArr = await homeworkCollection.aggregate([
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

      res.json({ msg: 'Mājasdarbs veiksmīgi atjaunināts!', homework: updatedHomeworkArr[0] });

    } catch (err) {
      console.error('Error updating homework:', err);
      if (err.name === 'BSONError') return res.status(400).json({ msg: 'Nederīgs ID formāts.' });
      res.status(500).json({ msg: 'Servera kļūda, atjauninot mājasdarbu.' });
    }
  });
});


// @route   DELETE api/homework/:id
// @desc    Delete a homework assignment
// @access  Private (only owner or admin)
router.delete('/:id', authMiddleware, async (req, res) => {
  const homeworkId = req.params.id;
  try {
    if (!ObjectId.isValid(homeworkId)) {
      return res.status(400).json({ msg: 'Nederīgs ID formāts.' });
    }
    const db = getDB();
    const homeworkCollection = db.collection('homeworks');
    const progressCollection = db.collection('userItemProgress');
    const commentsCollection = db.collection('comments');
    const notificationsCollection = db.collection('notifications');
    const itemObjectId = new ObjectId(homeworkId);

    const homeworkToDelete = await homeworkCollection.findOne({ _id: itemObjectId });
    if (!homeworkToDelete) {
      return res.status(404).json({ msg: 'Mājasdarbs nav atrasts.' });
    }

    if (homeworkToDelete.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Jums nav tiesību dzēst šo mājasdarbu.' });
    }

    const deleteResult = await homeworkCollection.deleteOne({ _id: itemObjectId });
    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({ msg: 'Mājasdarbs netika atrasts vai jau ir dzēsts.' });
    }

    await progressCollection.deleteMany({ itemId: itemObjectId });
    await commentsCollection.deleteMany({ itemId: itemObjectId });
    await notificationsCollection.deleteMany({ relatedItemId: itemObjectId, relatedItemType: 'homework' });
    await notificationsCollection.deleteMany({ relatedItemId: itemObjectId, relatedItemType: 'comment' }); // If comments link to homework


    res.json({ msg: 'Mājasdarbs veiksmīgi dzēsts.' });
  } catch (err) {
    console.error('Error deleting homework:', err);
    res.status(500).json({ msg: 'Servera kļūda, dzēšot mājasdarbu.' });
  }
});

module.exports = router;