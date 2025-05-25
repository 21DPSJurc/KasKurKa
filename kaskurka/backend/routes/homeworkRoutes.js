const express = require('express');
const router = express.Router();
const { getDB } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware'); // Autentifikācijas starpprogrammatūra.
const { ObjectId } = require('mongodb'); // MongoDB ObjectId.
// Multer un saistītā failu augšupielādes loģika ir noņemta.

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

// @route   POST api/homework
// @desc    Pievieno jaunu mājasdarba uzdevumu.
// @access  Privāts
router.post('/', authMiddleware, async (req, res) => {
  // Failu augšupielādes loģika noņemta.
  const { subject, description, dueDate, additionalInfo, links, customGroupId } = req.body;
  const errors = []; // Masīvs kļūdu ziņojumiem.

  // Validācijas.
  if (!subject || subject.trim() === '') errors.push('Mācību priekšmets ir obligāts lauks.');
  if (!description || description.trim() === '') errors.push('Detalizēts uzdevuma apraksts ir obligāts lauks.');
  if (!dueDate) errors.push('Izpildes termiņš ir obligāts lauks.');
  else {
    // Datuma formāta validācija.
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dueDate) || isNaN(new Date(dueDate).getTime())) {
      errors.push('Norādītais datums nav korekts. Izmantojiet GGGG-MM-DD formātu.');
    }
  }
  // Pārbauda, vai ir norādīts derīgs grupas ID.
  if (!customGroupId || !ObjectId.isValid(customGroupId)) {
    errors.push('Nepieciešams norādīt derīgu grupu, kurai pievienot mājasdarbu.');
  }

  // Validē saites, ja tās ir norādītas.
  if (links && links.trim() !== '') {
    const linksArray = links.split('\n').map(link => link.trim()).filter(link => link !== '');
    for (const link of linksArray) {
      if (!link.startsWith('http://') && !link.startsWith('https://')) {
        errors.push(`Saite "${link.substring(0, 30)}..." nav korekta. Tai jāsākas ar http:// vai https://`);
        break; // Pietiek ar vienu nekorektu saiti.
      }
    }
  }
  // Ja ir validācijas kļūdas, atgriež pirmo no tām.
  if (errors.length > 0) return res.status(400).json({ msg: errors[0] });

  try {
    const db = getDB();
    const homeworkCollection = db.collection('homeworks');
    const usersCollection = db.collection('users');
    const groupsCollection = db.collection('groups');

    // Atrod lietotāju, kas veido mājasdarbu.
    const userCreating = await usersCollection.findOne({ _id: new ObjectId(req.user.id) });
    if (!userCreating) {
      return res.status(404).json({ msg: 'Lietotājs nav atrasts.' });
    }

    // Pārbauda, vai mērķa grupa eksistē.
    const groupObjectId = new ObjectId(customGroupId);
    const targetGroup = await groupsCollection.findOne({ _id: groupObjectId });
    if (!targetGroup) {
      return res.status(400).json({ msg: 'Norādītā grupa neeksistē.' });
    }

    // Pārbauda studenta tiesības pievienot mājasdarbu šai grupai.
    if (req.user.role === 'student') {
      const enrolledIds = (userCreating.enrolledCustomGroups || []).map(id => id.toString());
      if (!enrolledIds.includes(customGroupId)) {
        return res.status(403).json({ msg: 'Jums nav tiesību pievienot mājasdarbu šai grupai.' });
      }
    }
    // Administrators var pievienot jebkurai grupai (grupas eksistence jau pārbaudīta).

    // `fileAttachments` lauks noņemts.
    const newHomework = {
      subject, description, dueDate: new Date(dueDate), additionalInfo: additionalInfo || '',
      links: links ? links.split('\n').map(link => link.trim()).filter(link => link !== '') : [],
      // `fileAttachments` noņemts.
      userId: new ObjectId(req.user.id), // Mājasdarba autora ID.
      userFirstName: req.user.firstName, // Autora vārds.
      userGroup: req.user.group, // Autora reģistrācijas grupa.
      userStudyStartYear: req.user.studyStartYear, // Autora studiju sākuma gads.
      customGroupId: groupObjectId, // Pielāgotās grupas ID, kurai mājasdarbs pieder.
      createdAt: new Date(),
      updatedAt: new Date(),
      type: 'homework' // Vienuma tips.
    };
    const result = await homeworkCollection.insertOne(newHomework);
    const createdHomework = await homeworkCollection.findOne({ _id: result.insertedId });

    // Pievieno grupas nosaukumu atgriežamajam objektam tūlītējai attēlošanai.
    createdHomework.customGroupName = targetGroup.name;


    // Izveido paziņojumus grupas dalībniekiem.
    if (targetGroup.members && targetGroup.members.length > 0) {
      const notificationMessage = `Grupai '${targetGroup.name}' pievienots jauns mājasdarbs: "${createdHomework.subject}".`;
      const notificationLink = `/homework-list`; // Saite uz mājasdarbu sarakstu.

      for (const memberId of targetGroup.members) {
        // Nepaziņo pašam mājasdarba veidotājam.
        if (memberId.toString() !== req.user.id) {
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
    console.error('Kļūda pievienojot mājasdarbu:', err);
    res.status(500).json({ msg: 'Servera kļūda pievienojot mājasdarbu.' });
  }
});

// @route   GET api/homework
// @desc    Iegūst visus lietotājam relevantos mājasdarbus (kārtotus pēc izpildes termiņa augoši).
// @access  Privāts
router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = getDB();
    const homeworkCollection = db.collection('homeworks');

    let initialMatch = {}; // Sākotnējais atlases kritērijs.
    // Ja lietotājs ir students, atlasa mājasdarbus tikai no grupām, kurās viņš ir reģistrēts.
    if (req.user.role === 'student') {
      const enrolledCustomGroupObjectIds = (req.user.enrolledCustomGroupIds || []).map(id => new ObjectId(id));
      // Ja students nav nevienā grupā, atgriež tukšu masīvu.
      if (enrolledCustomGroupObjectIds.length === 0) {
        return res.json([]);
      }
      initialMatch = { customGroupId: { $in: enrolledCustomGroupObjectIds } };
    } else if (req.user.role === 'admin') {
      initialMatch = {}; // Administrators redz visus mājasdarbus.
    } else {
      return res.status(403).json({ msg: "Nezināma lietotāja loma." });
    }

    // Izmanto agregāciju, lai pievienotu grupas nosaukumu katram mājasdarbam.
    const homeworks = await homeworkCollection.aggregate([
      { $match: initialMatch }, // Sākotnējā atlase.
      { // Savieno ar 'groups' kolekciju.
        $lookup: {
          from: 'groups',
          localField: 'customGroupId',
          foreignField: '_id',
          as: 'groupInfo'
        }
      },
      { $unwind: { path: '$groupInfo', preserveNullAndEmptyArrays: true } }, // Pārvērš `groupInfo` masīvu par objektu.
      { // Pievieno `customGroupName` lauku.
        $addFields: {
          customGroupName: { $ifNull: ['$groupInfo.name', 'Nezināma grupa'] } // Ja grupa nav atrasta, izmanto "Nezināma grupa".
        }
      },
      { $project: { groupInfo: 0 } }, // Noņem lieko `groupInfo` lauku. `fileAttachments` lauks vairs nepastāv.
      { $sort: { dueDate: 1, createdAt: -1 } } // Kārto pēc izpildes termiņa (augoši), tad pēc izveides laika (dilstoši).
    ]).toArray();

    res.json(homeworks);
  } catch (err) {
    console.error('Kļūda ielādējot mājasdarbus:', err);
    res.status(500).json({ msg: 'Servera kļūda ielādējot mājasdarbus.' });
  }
});

// @route   GET api/homework/:id
// @desc    Iegūst vienu mājasdarba vienumu pēc ID.
// @access  Privāts
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const db = getDB();
    const homeworkCollection = db.collection('homeworks');

    // Pārbauda, vai ID ir derīgs ObjectId formāts.
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ msg: 'Nederīgs ID formāts.' });
    }
    const homeworkId = new ObjectId(req.params.id);

    // Agregācija, lai pievienotu grupas nosaukumu.
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
      { $project: { groupInfo: 0 } } // `fileAttachments` lauks vairs nepastāv.
    ]).toArray();

    const homework = homeworkArray.length > 0 ? homeworkArray[0] : null;

    if (!homework) {
      return res.status(404).json({ msg: 'Mājasdarbs nav atrasts.' });
    }

    // Ja lietotājs ir students, pārbauda, vai viņam ir tiesības skatīt šo mājasdarbu (pieder viņa grupai).
    if (req.user.role === 'student') {
      const enrolledCustomGroupIdsStrings = req.user.enrolledCustomGroupIds || [];
      if (!homework.customGroupId || !enrolledCustomGroupIdsStrings.includes(homework.customGroupId.toString())) {
        return res.status(403).json({ msg: 'Jums nav tiesību skatīt šo mājasdarbu.' });
      }
    }
    res.json(homework);
  } catch (err) {
    console.error('Kļūda, ielādējot vienu mājasdarbu:', err);
    if (err.name === 'BSONError') return res.status(400).json({ msg: 'Nederīgs ID formāts.' });
    res.status(500).json({ msg: 'Servera kļūda, ielādējot mājasdarbu.' });
  }
});


// @route   PUT api/homework/:id
// @desc    Atjaunina mājasdarba uzdevumu.
// @access  Privāts (tikai īpašnieks vai administrators)
router.put('/:id', authMiddleware, async (req, res) => {
  // Failu augšupielādes loģika noņemta.
  const { subject, description, dueDate, additionalInfo, links, customGroupId } = req.body; // `clearFiles` noņemts.
  const homeworkId = req.params.id;
  const errors = [];

  if (!ObjectId.isValid(homeworkId)) {
    return res.status(400).json({ msg: 'Nederīgs mājasdarba ID formāts.' });
  }

  // Validācijas.
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

    // Atrod esošo mājasdarbu.
    const existingHomework = await homeworkCollection.findOne({ _id: itemObjectId });
    if (!existingHomework) {
      return res.status(404).json({ msg: 'Mājasdarbs nav atrasts.' });
    }

    // Pārbauda, vai lietotājam ir tiesības rediģēt.
    if (existingHomework.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Jums nav tiesību rediģēt šo mājasdarbu.' });
    }

    // Sagatavo atjaunināmos laukus.
    const updateFields = { updatedAt: new Date() };
    if (subject) updateFields.subject = subject;
    if (description) updateFields.description = description;
    if (dueDate) updateFields.dueDate = new Date(dueDate);
    if (typeof additionalInfo !== 'undefined') updateFields.additionalInfo = additionalInfo;
    if (typeof links !== 'undefined') updateFields.links = links ? links.split('\n').map(link => link.trim()).filter(link => link !== '') : [];

    // Pārvalda `customGroupId` maiņu.
    if (customGroupId) {
      if (req.user.role === 'student') {
        // Students var mainīt grupu tikai uz tām, kurās ir reģistrēts.
        const userCreating = await usersCollection.findOne({ _id: new ObjectId(req.user.id) });
        const enrolledIds = (userCreating.enrolledCustomGroups || []).map(id => id.toString());
        if (!enrolledIds.includes(customGroupId)) {
          return res.status(403).json({ msg: 'Jums nav tiesību pārvietot mājasdarbu uz šo grupu.' });
        }
      } else if (req.user.role === 'admin') {
        // Administrators var mainīt uz jebkuru eksistējošu grupu.
        const groupExists = await db.collection('groups').findOne({ _id: new ObjectId(customGroupId) });
        if (!groupExists) {
          return res.status(400).json({ msg: 'Norādītā mērķa grupa neeksistē.' });
        }
      }
      updateFields.customGroupId = new ObjectId(customGroupId);
    }

    // `fileAttachments` loģika noņemta.
    // Ja nepieciešams noņemt `fileAttachments` lauku no datubāzes ierakstiem, pievieno `$unset`.
    if (Object.prototype.hasOwnProperty.call(existingHomework, 'fileAttachments')) {
      updateFields.$unset = { fileAttachments: "" }; // Noņem veco lauku.
    }


    await homeworkCollection.updateOne(
      { _id: itemObjectId },
      { $set: updateFields }
    );

    // Iegūst atjaunināto mājasdarbu ar grupas nosaukumu.
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
      { $project: { groupInfo: 0 } } // `fileAttachments` lauks vairs nepastāv.
    ]).toArray();

    res.json({ msg: 'Mājasdarbs veiksmīgi atjaunināts!', homework: updatedHomeworkArr[0] });

  } catch (err) {
    console.error('Kļūda, atjauninot mājasdarbu:', err);
    if (err.name === 'BSONError') return res.status(400).json({ msg: 'Nederīgs ID formāts.' });
    res.status(500).json({ msg: 'Servera kļūda, atjauninot mājasdarbu.' });
  }
});


// @route   DELETE api/homework/:id
// @desc    Dzēš mājasdarba uzdevumu.
// @access  Privāts (tikai īpašnieks vai administrators)
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

    // Atrod dzēšamo mājasdarbu.
    const homeworkToDelete = await homeworkCollection.findOne({ _id: itemObjectId });
    if (!homeworkToDelete) {
      return res.status(404).json({ msg: 'Mājasdarbs nav atrasts.' });
    }

    // Pārbauda tiesības dzēst.
    if (homeworkToDelete.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Jums nav tiesību dzēst šo mājasdarbu.' });
    }

    // Failu dzēšanas loģika no GridFS vai diska šeit būtu, ja tāda būtu implementēta.
    // Tā kā failu funkcionalitāte ir noņemta, šis solis nav nepieciešams.

    // Dzēš mājasdarbu.
    const deleteResult = await homeworkCollection.deleteOne({ _id: itemObjectId });
    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({ msg: 'Mājasdarbs netika atrasts vai jau ir dzēsts.' });
    }

    // Dzēš saistītos datus: progresu, komentārus, paziņojumus.
    await progressCollection.deleteMany({ itemId: itemObjectId });
    await commentsCollection.deleteMany({ itemId: itemObjectId });
    await notificationsCollection.deleteMany({ relatedItemId: itemObjectId, relatedItemType: 'homework' });
    // Pieņemot, ka komentāri rada paziņojumus, kas saistīti ar galveno vienumu.
    // Ja komentāri paši varētu būt 'relatedItemType: comment', tas būtu sarežģītāk.
    // Pašreiz paziņojumi 'COMMENT_ON_OWNED_ITEM' izmanto 'homework' vai 'test' kā `relatedItemType`.
    // Tāpēc paziņojumu dzēšana, kur `relatedItemType` ir 'comment', var nebūt nepieciešama,
    // ja vien komentāriem nevarētu atbildēt, radot savus tiešos paziņojumus.
    // Specifikācija norāda, ka komentāri ir par vienumiem, tātad to paziņojumi ir saistīti ar vienuma tipu.
    // Līnija zemāk varētu būt lieka vai paredzēta citai funkcionalitātei.
    // await notificationsCollection.deleteMany({ relatedItemId: itemObjectId, relatedItemType: 'comment' }); 


    res.json({ msg: 'Mājasdarbs veiksmīgi dzēsts.' });
  } catch (err) {
    console.error('Kļūda, dzēšot mājasdarbu:', err);
    res.status(500).json({ msg: 'Servera kļūda, dzēšot mājasdarbu.' });
  }
});

module.exports = router;