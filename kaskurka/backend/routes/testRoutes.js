const express = require('express');
const router = express.Router();
const { getDB } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware'); // Autentifikācijas starpprogrammatūra.
const { ObjectId } = require('mongodb'); // MongoDB ObjectId.

// Palīgfunkcija paziņojumu izveidei (vēlāk var pārvietot uz servisu).
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
    console.error(`Kļūda, veidojot paziņojumu lietotājam ${recipientUserId}:`, error);
  }
}

// @route   POST api/tests
// @desc    Pievieno jaunu pārbaudes darba/eksāmena ierakstu.
// @access  Privāts
router.post('/', authMiddleware, async (req, res) => {
  const { subject, eventDate, eventTime, topics, format, additionalInfo, customGroupId } = req.body;
  const errors = []; // Kļūdu masīvs.

  // Validācijas.
  if (!subject || subject.trim() === '') errors.push('Mācību priekšmets ir obligāts lauks.');
  if (!eventDate) errors.push('Norises datums ir obligāts lauks.');
  else {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(eventDate) || isNaN(new Date(eventDate).getTime())) {
      errors.push('Norādītais norises datums nav korekts. Izmantojiet GGGG-MM-DD formātu.');
    }
  }
  // Laika formāta validācija, ja tas ir norādīts.
  if (eventTime && !/^\d{2}:\d{2}$/.test(eventTime)) {
    errors.push('Norādītais laiks nav korekts. Izmantojiet HH:MM formātu.');
  }
  // Pārbauda, vai ir norādīts derīgs grupas ID.
  if (!customGroupId || !ObjectId.isValid(customGroupId)) {
    errors.push('Nepieciešams norādīt derīgu grupu, kurai pievienot pārbaudes darbu.');
  }
  if (errors.length > 0) return res.status(400).json({ msg: errors[0] }); // Atgriež pirmo kļūdu.

  try {
    const db = getDB();
    const testsCollection = db.collection('tests');
    const usersCollection = db.collection('users');
    const groupsCollection = db.collection('groups');

    // Atrod lietotāju, kas veido ierakstu.
    const userCreating = await usersCollection.findOne({ _id: new ObjectId(req.user.id) });
    if (!userCreating) {
      return res.status(404).json({ msg: 'Lietotājs nav atrasts.' });
    }

    // Pārbauda mērķa grupas eksistenci.
    const groupObjectId = new ObjectId(customGroupId);
    const targetGroup = await groupsCollection.findOne({ _id: groupObjectId });
    if (!targetGroup) {
      return res.status(400).json({ msg: 'Norādītā grupa neeksistē.' });
    }

    // Pārbauda studenta tiesības pievienot šai grupai.
    if (req.user.role === 'student') {
      const enrolledIds = (userCreating.enrolledCustomGroups || []).map(id => id.toString());
      if (!enrolledIds.includes(customGroupId)) {
        return res.status(403).json({ msg: 'Jums nav tiesību pievienot pārbaudes darbu šai grupai.' });
      }
    }
    // Administrators var pievienot jebkurai grupai.

    // Izveido jauna pārbaudes darba objektu.
    const newTest = {
      subject, eventDate: new Date(eventDate), eventTime: eventTime || '', topics: topics || '',
      format: format || '', additionalInfo: additionalInfo || '',
      userId: new ObjectId(req.user.id), // Autora ID.
      userFirstName: req.user.firstName, // Autora vārds.
      userGroup: req.user.group, // Autora reģistrācijas grupa.
      userStudyStartYear: req.user.studyStartYear, // Autora studiju sākuma gads.
      customGroupId: groupObjectId, // Pielāgotās grupas ID.
      createdAt: new Date(),
      updatedAt: new Date(),
      type: 'test' // Vienuma tips.
    };
    const result = await testsCollection.insertOne(newTest);
    const createdTest = await testsCollection.findOne({ _id: result.insertedId });

    // Pievieno grupas nosaukumu atgriežamajam objektam.
    createdTest.customGroupName = targetGroup.name;

    // Izveido paziņojumus grupas dalībniekiem.
    if (targetGroup.members && targetGroup.members.length > 0) {
      const notificationMessage = `Grupai '${targetGroup.name}' pievienots jauns pārbaudes darbs: "${createdTest.subject}".`;
      const notificationLink = `/homework-list`; // TODO: Varbūt saite uz konkrētu vienumu.

      for (const memberId of targetGroup.members) {
        if (memberId.toString() !== req.user.id) { // Nepaziņo autoram.
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
    console.error('Kļūda pievienojot pārbaudes darbu:', err);
    res.status(500).json({ msg: 'Servera kļūda pievienojot pārbaudes darbu.' });
  }
});

// @route   GET api/tests
// @desc    Iegūst visus lietotājam relevantos pārbaudes darbus (kārtotus pēc norises datuma augoši).
// @access  Privāts
router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = getDB();
    const testsCollection = db.collection('tests');
    // const today = new Date(); // Šobrīd netiek izmantots, lai filtrētu visus vienumus.
    // today.setHours(0, 0, 0, 0);

    let initialMatch = {}; // Sākotnējais atlases kritērijs.
    // Ja lietotājs ir students, atlasa tikai no viņa grupām.
    if (req.user.role === 'student') {
      const enrolledCustomGroupObjectIds = (req.user.enrolledCustomGroupIds || []).map(id => new ObjectId(id));
      if (enrolledCustomGroupObjectIds.length === 0) {
        return res.json([]); // Ja nav grupās, atgriež tukšu sarakstu.
      }
      initialMatch = { customGroupId: { $in: enrolledCustomGroupObjectIds } };
    } else if (req.user.role === 'admin') {
      initialMatch = {}; // Administrators redz visus.
    } else {
      return res.status(403).json({ msg: "Nezināma lietotāja loma." });
    }

    // Šeit netiek veikta datuma filtrēšana, lai iegūtu visus un ļautu lietotāja saskarnei veikt sākotnējo filtrēšanu/kārtošanu saraksta skatā.
    // initialMatch.eventDate = { $gte: today }; // Noņemts, lai rādītu visus HomeworkList skatā.

    // Agregācija, lai pievienotu grupas nosaukumu.
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
      { $sort: { eventDate: 1, createdAt: -1 } } // Kārto pēc norises datuma, tad pēc izveides laika.
    ]).toArray();

    res.json(tests);
  } catch (err) {
    console.error('Kļūda ielādējot pārbaudes darbus:', err);
    res.status(500).json({ msg: 'Servera kļūda ielādējot pārbaudes darbus.' });
  }
});

// @route   GET api/tests/:id
// @desc    Iegūst vienu pārbaudes darba vienumu pēc ID.
// @access  Privāts
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const db = getDB();
    const testsCollection = db.collection('tests');

    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ msg: 'Nederīgs ID formāts.' });
    }
    const testId = new ObjectId(req.params.id);

    // Agregācija, lai pievienotu grupas nosaukumu.
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

    // Ja lietotājs ir students, pārbauda tiesības skatīt.
    if (req.user.role === 'student') {
      const enrolledCustomGroupIdsStrings = req.user.enrolledCustomGroupIds || [];
      if (!test.customGroupId || !enrolledCustomGroupIdsStrings.includes(test.customGroupId.toString())) {
        return res.status(403).json({ msg: 'Jums nav tiesību skatīt šo pārbaudes darbu.' });
      }
    }
    res.json(test);
  } catch (err) {
    console.error('Kļūda, ielādējot vienu pārbaudes darbu:', err);
    if (err.name === 'BSONError') return res.status(400).json({ msg: 'Nederīgs ID formāts.' });
    res.status(500).json({ msg: 'Servera kļūda, ielādējot pārbaudes darbu.' });
  }
});

// @route   PUT api/tests/:id
// @desc    Atjaunina pārbaudes darba/eksāmena ierakstu.
// @access  Privāts (tikai īpašnieks vai administrators)
router.put('/:id', authMiddleware, async (req, res) => {
  const { subject, eventDate, eventTime, topics, format, additionalInfo, customGroupId } = req.body;
  const testId = req.params.id;
  const errors = [];

  if (!ObjectId.isValid(testId)) {
    return res.status(400).json({ msg: 'Nederīgs pārbaudes darba ID formāts.' });
  }

  // Validācijas.
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

    // Atrod esošo ierakstu.
    const existingTest = await testsCollection.findOne({ _id: itemObjectId });
    if (!existingTest) {
      return res.status(404).json({ msg: 'Pārbaudes darbs nav atrasts.' });
    }

    // Pārbauda tiesības rediģēt.
    if (existingTest.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Jums nav tiesību rediģēt šo ierakstu.' });
    }

    // Sagatavo atjaunināmos laukus.
    const updateFields = { updatedAt: new Date() };
    if (subject) updateFields.subject = subject;
    if (eventDate) updateFields.eventDate = new Date(eventDate);
    if (typeof eventTime !== 'undefined') updateFields.eventTime = eventTime; // `typeof` pārbauda, vai lauks ir nodots (var būt tukša virkne).
    if (typeof topics !== 'undefined') updateFields.topics = topics;
    if (typeof format !== 'undefined') updateFields.format = format;
    if (typeof additionalInfo !== 'undefined') updateFields.additionalInfo = additionalInfo;

    // Pārvalda `customGroupId` maiņu.
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

    // Iegūst atjaunināto ierakstu ar grupas nosaukumu.
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
    console.error('Kļūda, atjauninot pārbaudes darbu:', err);
    if (err.name === 'BSONError') return res.status(400).json({ msg: 'Nederīgs ID formāts.' });
    res.status(500).json({ msg: 'Servera kļūda, atjauninot pārbaudes darbu.' });
  }
});

// @route   DELETE api/tests/:id
// @desc    Dzēš pārbaudes darba/eksāmena ierakstu.
// @access  Privāts (tikai īpašnieks vai administrators)
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

    // Atrod dzēšamo ierakstu.
    const testToDelete = await testsCollection.findOne({ _id: itemObjectId });
    if (!testToDelete) {
      return res.status(404).json({ msg: 'Pārbaudes darbs nav atrasts.' });
    }

    // Pārbauda tiesības dzēst.
    if (testToDelete.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Jums nav tiesību dzēst šo ierakstu.' });
    }

    // Dzēš ierakstu.
    const deleteResult = await testsCollection.deleteOne({ _id: itemObjectId });
    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({ msg: 'Pārbaudes darbs netika atrasts vai jau ir dzēsts.' });
    }

    // Dzēš saistītos datus.
    await progressCollection.deleteMany({ itemId: itemObjectId });
    await commentsCollection.deleteMany({ itemId: itemObjectId });
    await notificationsCollection.deleteMany({ relatedItemId: itemObjectId, relatedItemType: 'test' });
    // Dzēš paziņojumus, kas saistīti ar komentāriem šim pārbaudes darbam.
    await notificationsCollection.deleteMany({ relatedItemId: itemObjectId, relatedItemType: 'comment' });


    res.json({ msg: 'Pārbaudes darbs veiksmīgi dzēsts.' });
  } catch (err) {
    console.error('Kļūda, dzēšot pārbaudes darbu:', err);
    res.status(500).json({ msg: 'Servera kļūda, dzēšot pārbaudes darbu.' });
  }
});

module.exports = router;