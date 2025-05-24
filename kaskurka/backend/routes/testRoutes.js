// kaskurka/backend/routes/testRoutes.js
const express = require('express');
const router = express.Router();
const { getDB } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const { ObjectId } = require('mongodb');

// @route   POST api/tests
// @desc    Add a new test/examination entry
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
  const { subject, eventDate, eventTime, topics, format, additionalInfo } = req.body;
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
  if (errors.length > 0) return res.status(400).json({ msg: errors[0] });

  try {
    const db = getDB();
    const testsCollection = db.collection('tests');
    const newTest = {
      subject, eventDate: new Date(eventDate), eventTime: eventTime || '', topics: topics || '',
      format: format || '', additionalInfo: additionalInfo || '', userId: new ObjectId(req.user.id),
      userFirstName: req.user.firstName, userGroup: req.user.group, userSubgroup: req.user.subgroup,
      userStudyStartYear: req.user.studyStartYear, createdAt: new Date(), updatedAt: new Date(), type: 'test'
    };
    const result = await testsCollection.insertOne(newTest);
    const createdTest = await testsCollection.findOne({ _id: result.insertedId });
    res.status(201).json({ msg: 'Pārbaudes darbs veiksmīgi pievienots!', test: createdTest });
  } catch (err) {
    console.error('Error adding test:', err);
    res.status(500).json({ msg: 'Servera kļūda pievienojot pārbaudes darbu.' });
  }
});

// @route   GET api/tests
// @desc    Get all tests for the user's group
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = getDB();
    const testsCollection = db.collection('tests');
    const userGroup = req.user.group;
    if (!userGroup) return res.status(400).json({ msg: 'Lietotāja grupa nav atrasta profilā.' });
    const tests = await testsCollection.find({ userGroup: userGroup }).sort({ eventDate: -1 }).toArray();
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
        const testId = new ObjectId(req.params.id);

        const test = await testsCollection.findOne({ _id: testId });

        if (!test) {
            return res.status(404).json({ msg: 'Pārbaudes darbs nav atrasts.' });
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
// @access  Private (only owner)
router.put('/:id', authMiddleware, async (req, res) => {
  const { subject, eventDate, eventTime, topics, format, additionalInfo } = req.body;
  const testId = req.params.id;
  const errors = [];

  if (subject && subject.trim() === '') errors.push('Mācību priekšmets nevar būt tukšs.');
  if (eventDate) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(eventDate) || isNaN(new Date(eventDate).getTime())) {
        errors.push('Norādītais datums nav korekts. Izmantojiet GGGG-MM-DD formātu.');
    }
  }
  if (eventTime && eventTime.trim() !== '' && !/^\d{2}:\d{2}$/.test(eventTime)) { // Allow empty time
    errors.push('Norādītais laiks nav korekts. Izmantojiet HH:MM formātu.');
  }
  if (errors.length > 0) return res.status(400).json({ msg: errors[0] });

  try {
    const db = getDB();
    const testsCollection = db.collection('tests');
    const itemObjectId = new ObjectId(testId);

    const existingTest = await testsCollection.findOne({ _id: itemObjectId });
    if (!existingTest) {
      return res.status(404).json({ msg: 'Pārbaudes darbs nav atrasts.' });
    }
    if (existingTest.userId.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Jums nav tiesību rediģēt šo ierakstu.' });
    }

    const updateFields = { updatedAt: new Date() };
    if (subject) updateFields.subject = subject;
    if (eventDate) updateFields.eventDate = new Date(eventDate);
    if (typeof eventTime !== 'undefined') updateFields.eventTime = eventTime; // Can be empty string
    if (typeof topics !== 'undefined') updateFields.topics = topics;
    if (typeof format !== 'undefined') updateFields.format = format;
    if (typeof additionalInfo !== 'undefined') updateFields.additionalInfo = additionalInfo;

    const result = await testsCollection.updateOne(
      { _id: itemObjectId, userId: new ObjectId(req.user.id) },
      { $set: updateFields }
    );
    
    if (result.matchedCount === 0) {
        return res.status(404).json({ msg: 'Pārbaudes darbs nav atrasts vai jums nav tiesību to rediģēt.' });
    }
    if (result.modifiedCount === 0) {
        return res.json({ msg: 'Izmaiņas netika veiktas (iespējams, dati ir tādi paši).', test: existingTest });
    }

    const updatedTest = await testsCollection.findOne({ _id: itemObjectId });
    res.json({ msg: 'Pārbaudes darbs veiksmīgi atjaunināts!', test: updatedTest });

  } catch (err) {
    console.error('Error updating test:', err);
    if (err.name === 'BSONError') return res.status(400).json({ msg: 'Nederīgs ID formāts.' });
    res.status(500).json({ msg: 'Servera kļūda, atjauninot pārbaudes darbu.' });
  }
});

// @route   DELETE api/tests/:id
// @desc    Delete a test/examination entry
// @access  Private (only owner)
// kaskurka/backend/routes/testRoutes.js
// ... (other routes remain the same) ...

// @route   DELETE api/tests/:id
// @desc    Delete a test/examination entry
// @access  Private (only owner)
router.delete('/:id', authMiddleware, async (req, res) => {
  const testId = req.params.id;
  try {
    const db = getDB();
    const testsCollection = db.collection('tests');
    const progressCollection = db.collection('userItemProgress');
    const commentsCollection = db.collection('comments'); // Added
    const itemObjectId = new ObjectId(testId);

    const testToDelete = await testsCollection.findOne({ _id: itemObjectId });
    if (!testToDelete) {
      return res.status(404).json({ msg: 'Pārbaudes darbs nav atrasts.' });
    }
    if (testToDelete.userId.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Jums nav tiesību dzēst šo ierakstu.' });
    }

    const deleteResult = await testsCollection.deleteOne({ _id: itemObjectId });
    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({ msg: 'Pārbaudes darbs netika atrasts vai jau ir dzēsts.' });
    }
    
    await progressCollection.deleteMany({ itemId: itemObjectId });
    await commentsCollection.deleteMany({ itemId: itemObjectId }); // Added

    res.json({ msg: 'Pārbaudes darbs veiksmīgi dzēsts.' });
  } catch (err) {
    console.error('Error deleting test:', err);
    if (err.name === 'BSONError') return res.status(400).json({ msg: 'Nederīgs ID formāts.' });
    res.status(500).json({ msg: 'Servera kļūda, dzēšot pārbaudes darbu.' });
  }
});

module.exports = router;