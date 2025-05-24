// kaskurka/backend/routes/progressRoutes.js
const express = require('express');
const router = express.Router();
const { getDB } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const { ObjectId } = require('mongodb');

// @route   POST api/progress
// @desc    Set or update progress status for an item (homework or test)
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
  const { itemId, status } = req.body; // status can be 'done' or 'not_done' (or boolean true/false)
  const userId = new ObjectId(req.user.id);

  if (!itemId || typeof status === 'undefined') {
    return res.status(400).json({ msg: 'Nepieciešams ID un statuss.' }); // Item ID and status are required
  }

  try {
    const db = getDB();
    const progressCollection = db.collection('userItemProgress');

    // Validate itemId (optional, but good practice)
    // Check if item actually exists in homeworks or tests collection
    // For now, we'll assume itemId is valid if provided.

    const itemObjectId = new ObjectId(itemId);

    const result = await progressCollection.updateOne(
      { userId: userId, itemId: itemObjectId },
      { $set: { status: status, updatedAt: new Date() } },
      { upsert: true } // Creates the document if it doesn't exist
    );

    if (result.modifiedCount > 0 || result.upsertedCount > 0) {
      res.json({ msg: 'Progresa statuss veiksmīgi atjaunināts.', itemId, status });
    } else {
      // This case might happen if the status submitted is the same as already in DB
      // and no upsert happened. Still a success in terms of state.
      res.json({ msg: 'Progresa statuss jau bija aktuāls.', itemId, status });
    }

  } catch (err) {
    console.error('Error updating progress:', err);
    if (err.name === 'BSONError' && err.message.includes('Argument passed in must be a string of 12 bytes or a string of 24 hex characters or an integer')) {
        return res.status(400).json({ msg: 'Nederīgs vienuma ID formāts.' });
    }
    res.status(500).json({ msg: 'Servera kļūda atjauninot progresu.' });
  }
});

// @route   GET api/progress
// @desc    Get all progress statuses for the logged-in user
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  const userId = new ObjectId(req.user.id);

  try {
    const db = getDB();
    const progressCollection = db.collection('userItemProgress');

    const userProgress = await progressCollection.find({ userId: userId }).toArray();
    
    // Convert to a map for easier lookup on the frontend: { itemId: status }
    const progressMap = userProgress.reduce((acc, curr) => {
      acc[curr.itemId.toString()] = curr.status;
      return acc;
    }, {});

    res.json(progressMap);

  } catch (err) {
    console.error('Error fetching progress:', err);
    res.status(500).json({ msg: 'Servera kļūda ielādējot progresu.' });
  }
});

module.exports = router;