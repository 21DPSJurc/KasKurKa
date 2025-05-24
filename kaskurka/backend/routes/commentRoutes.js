// kaskurka/backend/routes/commentRoutes.js
const express = require('express');
const router = express.Router();
const { getDB } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const { ObjectId } = require('mongodb');

// @route   POST api/comments/:itemId
// @desc    Add a comment to an item (homework or test)
// @access  Private
router.post('/:itemId', authMiddleware, async (req, res) => {
  const { text } = req.body;
  const itemId = req.params.itemId;
  const userId = new ObjectId(req.user.id);
  const userName = req.user.firstName; // Get user's first name from token

  if (!text || text.trim() === '') {
    return res.status(400).json({ msg: 'Komentāra teksts nevar būt tukšs.' });
  }
  if (!ObjectId.isValid(itemId)) {
      return res.status(400).json({ msg: 'Nederīgs vienuma ID.' });
  }

  try {
    const db = getDB();
    const commentsCollection = db.collection('comments');
    // Optional: Check if the item (homework/test) actually exists before adding a comment
    // const homeworks = db.collection('homeworks');
    // const tests = db.collection('tests');
    // const itemExists = await homeworks.findOne({ _id: new ObjectId(itemId) }) || await tests.findOne({ _id: new ObjectId(itemId) });
    // if (!itemExists) {
    //   return res.status(404).json({ msg: 'Komentējamais ieraksts nav atrasts.' });
    // }

    const newComment = {
      itemId: new ObjectId(itemId),
      userId: userId,
      userName: userName, // Store userName for easy display
      text: text.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await commentsCollection.insertOne(newComment);
    const createdComment = await commentsCollection.findOne({ _id: result.insertedId });


    res.status(201).json({ msg: 'Komentārs veiksmīgi pievienots!', comment: createdComment });

  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({ msg: 'Servera kļūda, pievienojot komentāru.' });
  }
});

// @route   GET api/comments/:itemId
// @desc    Get all comments for a specific item
// @access  Private
router.get('/:itemId', authMiddleware, async (req, res) => {
  const itemId = req.params.itemId;
   if (!ObjectId.isValid(itemId)) {
      return res.status(400).json({ msg: 'Nederīgs vienuma ID.' });
  }

  try {
    const db = getDB();
    const commentsCollection = db.collection('comments');

    const comments = await commentsCollection
      .find({ itemId: new ObjectId(itemId) })
      .sort({ createdAt: 1 }) // Show oldest comments first, or -1 for newest
      .toArray();

    res.json(comments);

  } catch (err) {
    console.error('Error fetching comments:', err);
    res.status(500).json({ msg: 'Servera kļūda, ielādējot komentārus.' });
  }
});


// @route   DELETE api/comments/:commentId
// @desc    Delete a comment (by owner or admin - admin part not implemented yet)
// @access  Private
router.delete('/:commentId', authMiddleware, async (req, res) => {
    const commentId = req.params.commentId;
    const userId = new ObjectId(req.user.id);

    if (!ObjectId.isValid(commentId)) {
        return res.status(400).json({ msg: 'Nederīgs komentāra ID.' });
    }

    try {
        const db = getDB();
        const commentsCollection = db.collection('comments');

        const commentToDelete = await commentsCollection.findOne({ _id: new ObjectId(commentId) });

        if (!commentToDelete) {
            return res.status(404).json({ msg: 'Komentārs nav atrasts.' });
        }

        // Check if the logged-in user is the owner of the comment
        // Later, add admin role check: || req.user.role === 'admin'
        if (commentToDelete.userId.toString() !== userId.toString()) {
            return res.status(403).json({ msg: 'Jums nav tiesību dzēst šo komentāru.' });
        }

        const result = await commentsCollection.deleteOne({ _id: new ObjectId(commentId) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ msg: 'Komentārs netika atrasts vai jau ir dzēsts.' });
        }

        res.json({ msg: 'Komentārs veiksmīgi dzēsts.' });

    } catch (err) {
        console.error('Error deleting comment:', err);
        res.status(500).json({ msg: 'Servera kļūda, dzēšot komentāru.' });
    }
});


module.exports = router;