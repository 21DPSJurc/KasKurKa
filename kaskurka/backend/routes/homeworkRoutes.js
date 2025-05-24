// kaskurka/backend/routes/homeworkRoutes.js
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
}).array('files', 5); // 'files' is the field name for new/updated files

// @route   POST api/homework
// @desc    Add a new homework assignment
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      // ... (error handling as before)
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ msg: 'Viens no failiem ir pārāk liels (Maks. 5MB).' });
      }
      return res.status(400).json({ msg: `Faila augšupielādes kļūda: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ msg: err.message || 'Neatļauts faila tips vai cita augšupielādes kļūda.' });
    }

    const { subject, description, dueDate, additionalInfo, links } = req.body;
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
    if (links && links.trim() !== '') {
      const linksArray = links.split('\n').map(link => link.trim()).filter(link => link !== '');
      for (const link of linksArray) {
        if (!link.startsWith('http://') && !link.startsWith('https://')) {
          errors.push(`Saite "${link.substring(0,30)}..." nav korekta. Tai jāsākas ar http:// vai https://`);
          break; 
        }
      }
    }
    if (errors.length > 0) return res.status(400).json({ msg: errors[0] });

    try {
      const db = getDB();
      const homeworkCollection = db.collection('homeworks');
      const fileAttachments = req.files ? req.files.map(file => ({
        originalName: file.originalname, mimeType: file.mimetype, size: file.size,
        storageReference: `Stored in memory (transient) - ${file.originalname}` 
      })) : [];

      const newHomework = {
        subject, description, dueDate: new Date(dueDate), additionalInfo: additionalInfo || '',
        links: links ? links.split('\n').map(link => link.trim()).filter(link => link !== '') : [],
        fileAttachments, userId: new ObjectId(req.user.id), userFirstName: req.user.firstName, 
        userGroup: req.user.group, userSubgroup: req.user.subgroup, 
        userStudyStartYear: req.user.studyStartYear, createdAt: new Date(), updatedAt: new Date(),
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
// @desc    Get all homework for the user's group
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = getDB();
    const homeworkCollection = db.collection('homeworks');
    const userGroup = req.user.group; 
    if (!userGroup) return res.status(400).json({ msg: 'Lietotāja grupa nav atrasta profilā.' });
    const homeworks = await homeworkCollection.find({ userGroup: userGroup }).sort({ dueDate: -1 }).toArray();
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
        const homeworkId = new ObjectId(req.params.id);

        const homework = await homeworkCollection.findOne({ _id: homeworkId });

        if (!homework) {
            return res.status(404).json({ msg: 'Mājasdarbs nav atrasts.' });
        }
        // Optionally, you could restrict access here based on user group if needed,
        // but for editing, the user ID check is more critical.
        res.json(homework);
    } catch (err) {
        console.error('Error fetching single homework:', err);
        if (err.name === 'BSONError') return res.status(400).json({ msg: 'Nederīgs ID formāts.' });
        res.status(500).json({ msg: 'Servera kļūda, ielādējot mājasdarbu.' });
    }
});


// @route   PUT api/homework/:id
// @desc    Update a homework assignment
// @access  Private (only owner)
router.put('/:id', authMiddleware, async (req, res) => {
  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      // ... (error handling as before)
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ msg: 'Viens no failiem ir pārāk liels (Maks. 5MB).' });
      }
      return res.status(400).json({ msg: `Faila augšupielādes kļūda: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ msg: err.message || 'Neatļauts faila tips vai cita augšupielādes kļūda.' });
    }

    const { subject, description, dueDate, additionalInfo, links } = req.body;
    const homeworkId = req.params.id;
    const errors = [];

    // Basic validation for updated fields
    if (subject && subject.trim() === '') errors.push('Mācību priekšmets nevar būt tukšs.');
    if (description && description.trim() === '') errors.push('Apraksts nevar būt tukšs.');
    if (dueDate) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dueDate) || isNaN(new Date(dueDate).getTime())) {
            errors.push('Norādītais datums nav korekts. Izmantojiet GGGG-MM-DD formātu.');
        }
    }
     if (links && links.trim() !== '') { // Check links only if provided
        const linksArray = links.split('\n').map(link => link.trim()).filter(link => link !== '');
        for (const link of linksArray) {
            if (!link.startsWith('http://') && !link.startsWith('https://')) {
            errors.push(`Saite "${link.substring(0,30)}..." nav korekta. Tai jāsākas ar http:// vai https://`);
            break; 
            }
        }
    }
    if (errors.length > 0) return res.status(400).json({ msg: errors[0] });

    try {
      const db = getDB();
      const homeworkCollection = db.collection('homeworks');
      const itemObjectId = new ObjectId(homeworkId);

      const existingHomework = await homeworkCollection.findOne({ _id: itemObjectId });
      if (!existingHomework) {
        return res.status(404).json({ msg: 'Mājasdarbs nav atrasts.' });
      }
      if (existingHomework.userId.toString() !== req.user.id) {
        return res.status(403).json({ msg: 'Jums nav tiesību rediģēt šo mājasdarbu.' });
      }

      const updateFields = { updatedAt: new Date() };
      if (subject) updateFields.subject = subject;
      if (description) updateFields.description = description;
      if (dueDate) updateFields.dueDate = new Date(dueDate);
      if (typeof additionalInfo !== 'undefined') updateFields.additionalInfo = additionalInfo;
      if (typeof links !== 'undefined') updateFields.links = links ? links.split('\n').map(link => link.trim()).filter(link => link !== '') : [];
      
      // Handle file updates: If new files are provided, they replace old ones.
      // More sophisticated logic (add/remove individual files) is complex for now.
      if (req.files && req.files.length > 0) {
        updateFields.fileAttachments = req.files.map(file => ({
          originalName: file.originalname, mimeType: file.mimetype, size: file.size,
          storageReference: `Stored in memory (transient) - ${file.originalname}`
        }));
      } else if (req.body.clearFiles === 'true') { // Allow clearing files if a specific flag is sent
          updateFields.fileAttachments = [];
      }
      // If no req.files and no clearFiles, fileAttachments remain unchanged unless explicitly set to [] by client.

      const result = await homeworkCollection.updateOne(
        { _id: itemObjectId, userId: new ObjectId(req.user.id) }, // Ensure user ownership again in query
        { $set: updateFields }
      );

      if (result.matchedCount === 0) { // Should not happen if previous checks passed
          return res.status(404).json({ msg: 'Mājasdarbs nav atrasts vai jums nav tiesību to rediģēt.' });
      }
      if (result.modifiedCount === 0 && !(req.files && req.files.length > 0) && req.body.clearFiles !== 'true') {
          return res.json({ msg: 'Izmaiņas netika veiktas (iespējams, dati ir tādi paši).', homework: existingHomework });
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
// @access  Private (only owner)
router.delete('/:id', authMiddleware, async (req, res) => {
  const homeworkId = req.params.id;
  try {
    const db = getDB();
    const homeworkCollection = db.collection('homeworks');
    const progressCollection = db.collection('userItemProgress');
    const commentsCollection = db.collection('comments'); // Added
    const itemObjectId = new ObjectId(homeworkId);

    const homeworkToDelete = await homeworkCollection.findOne({ _id: itemObjectId });
    if (!homeworkToDelete) {
      return res.status(404).json({ msg: 'Mājasdarbs nav atrasts.' });
    }
    if (homeworkToDelete.userId.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Jums nav tiesību dzēst šo mājasdarbu.' });
    }

    const deleteResult = await homeworkCollection.deleteOne({ _id: itemObjectId });
    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({ msg: 'Mājasdarbs netika atrasts vai jau ir dzēsts.' });
    }

    // Delete associated progress entries
    await progressCollection.deleteMany({ itemId: itemObjectId });
    // Delete associated comments
    await commentsCollection.deleteMany({ itemId: itemObjectId }); // Added

    res.json({ msg: 'Mājasdarbs veiksmīgi dzēsts.' });
  } catch (err) {
    console.error('Error deleting homework:', err);
    if (err.name === 'BSONError') return res.status(400).json({ msg: 'Nederīgs ID formāts.' });
    res.status(500).json({ msg: 'Servera kļūda, dzēšot mājasdarbu.' });
  }
});

module.exports = router;