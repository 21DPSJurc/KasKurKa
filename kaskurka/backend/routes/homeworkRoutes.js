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

    const { subject, description, dueDate, additionalInfo, links, customGroupId } = req.body; // Added customGroupId
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
      const usersCollection = db.collection('users'); // To check group membership

      const userCreating = await usersCollection.findOne({ _id: new ObjectId(req.user.id) });
      if (!userCreating) {
        return res.status(404).json({ msg: 'Lietotājs nav atrasts.' });
      }

      // Validate customGroupId membership for students
      if (req.user.role === 'student') {
        const enrolledIds = (userCreating.enrolledCustomGroups || []).map(id => id.toString());
        if (!enrolledIds.includes(customGroupId)) {
          return res.status(403).json({ msg: 'Jums nav tiesību pievienot mājasdarbu šai grupai.' });
        }
      } else if (req.user.role === 'admin') {
        // Admin can post to any group, check if group exists
        const groupExists = await db.collection('groups').findOne({ _id: new ObjectId(customGroupId) });
        if (!groupExists) {
          return res.status(400).json({ msg: 'Norādītā grupa neeksistē.' });
        }
      }


      const fileAttachments = req.files ? req.files.map(file => ({
        originalName: file.originalname, mimeType: file.mimetype, size: file.size,
        storageReference: `Stored in memory (transient) - ${file.originalname}`
      })) : [];

      const newHomework = {
        subject, description, dueDate: new Date(dueDate), additionalInfo: additionalInfo || '',
        links: links ? links.split('\n').map(link => link.trim()).filter(link => link !== '') : [],
        fileAttachments,
        userId: new ObjectId(req.user.id),
        userFirstName: req.user.firstName,
        userGroup: req.user.group, // Creator's registration group for display
        userStudyStartYear: req.user.studyStartYear,
        customGroupId: new ObjectId(customGroupId), // The custom group this item belongs to
        createdAt: new Date(),
        updatedAt: new Date(),
        type: 'homework'
      };
      const result = await homeworkCollection.insertOne(newHomework);
      const createdHomework = await homeworkCollection.findOne({ _id: result.insertedId });
      res.status(201).json({ msg: 'Mājasdarbs veiksmīgi pievienots!', homework: createdHomework });
    } catch (err) {
      console.error('Error adding homework:', err);
      res.status(500).json({ msg: 'Servera kļūda pievienojot mājasdarbu.' });
    }
  });
});

// @route   GET api/homework
// @desc    Get all homework relevant to the user
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = getDB();
    const homeworkCollection = db.collection('homeworks');

    let query = {};
    if (req.user.role === 'student') {
      const enrolledCustomGroupObjectIds = (req.user.enrolledCustomGroupIds || []).map(id => new ObjectId(id));
      if (enrolledCustomGroupObjectIds.length === 0) {
        return res.json([]); // Student not in any custom groups, sees no homework
      }
      query = { customGroupId: { $in: enrolledCustomGroupObjectIds } };
    } else if (req.user.role === 'admin') {
      // Admin sees all homework
      query = {};
    } else {
      return res.status(403).json({ msg: "Nezināma lietotāja loma." });
    }

    const homeworks = await homeworkCollection.find(query).sort({ dueDate: -1 }).toArray();
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
    const homework = await homeworkCollection.findOne({ _id: homeworkId });

    if (!homework) {
      return res.status(404).json({ msg: 'Mājasdarbs nav atrasts.' });
    }

    // Access control for students
    if (req.user.role === 'student') {
      const enrolledCustomGroupIdsStrings = req.user.enrolledCustomGroupIds || [];
      if (!homework.customGroupId || !enrolledCustomGroupIdsStrings.includes(homework.customGroupId.toString())) {
        return res.status(403).json({ msg: 'Jums nav tiesību skatīt šo mājasdarbu.' });
      }
    }
    // Admins can see any homework by ID

    res.json(homework);
  } catch (err) {
    console.error('Error fetching single homework:', err);
    // BSONError check was inside the if block, moved out
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

    const { subject, description, dueDate, additionalInfo, links, customGroupId } = req.body; // Added customGroupId
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
    if (customGroupId && !ObjectId.isValid(customGroupId)) { // customGroupId is optional on update, if not provided, it's not changed
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

      // Authorization: Only owner or admin can edit
      if (existingHomework.userId.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Jums nav tiesību rediģēt šo mājasdarbu.' });
      }

      const updateFields = { updatedAt: new Date() };
      if (subject) updateFields.subject = subject;
      if (description) updateFields.description = description;
      if (dueDate) updateFields.dueDate = new Date(dueDate);
      if (typeof additionalInfo !== 'undefined') updateFields.additionalInfo = additionalInfo;
      if (typeof links !== 'undefined') updateFields.links = links ? links.split('\n').map(link => link.trim()).filter(link => link !== '') : [];

      if (customGroupId) { // If a new customGroupId is provided
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

      const result = await homeworkCollection.updateOne(
        { _id: itemObjectId },
        { $set: updateFields }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ msg: 'Mājasdarbs netika atrasts.' }); // Should be caught by existingHomework check
      }

      const updatedHomework = await homeworkCollection.findOne({ _id: itemObjectId });
      res.json({ msg: 'Mājasdarbs veiksmīgi atjaunināts!', homework: updatedHomework });

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
    const itemObjectId = new ObjectId(homeworkId);

    const homeworkToDelete = await homeworkCollection.findOne({ _id: itemObjectId });
    if (!homeworkToDelete) {
      return res.status(404).json({ msg: 'Mājasdarbs nav atrasts.' });
    }

    // Authorization: Only owner or admin can delete
    if (homeworkToDelete.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Jums nav tiesību dzēst šo mājasdarbu.' });
    }

    const deleteResult = await homeworkCollection.deleteOne({ _id: itemObjectId });
    if (deleteResult.deletedCount === 0) {
      // This case should ideally not be hit if homeworkToDelete was found
      return res.status(404).json({ msg: 'Mājasdarbs netika atrasts vai jau ir dzēsts.' });
    }

    await progressCollection.deleteMany({ itemId: itemObjectId });
    await commentsCollection.deleteMany({ itemId: itemObjectId });

    res.json({ msg: 'Mājasdarbs veiksmīgi dzēsts.' });
  } catch (err) {
    console.error('Error deleting homework:', err);
    // BSONError check already done if ObjectId.isValid fails
    res.status(500).json({ msg: 'Servera kļūda, dzēšot mājasdarbu.' });
  }
});

module.exports = router;