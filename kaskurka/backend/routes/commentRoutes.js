const express = require('express');
const router = express.Router();
const { getDB } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const { ObjectId } = require('mongodb');

// Helper function to create notifications
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

// @route   POST api/comments/:itemId
// @desc    Add a comment to an item (homework or test)
// @access  Private
router.post('/:itemId', authMiddleware, async (req, res) => {
  const { text } = req.body;
  const itemId = req.params.itemId;
  const userId = new ObjectId(req.user.id);
  const userName = req.user.firstName;

  if (!text || text.trim() === '') {
    return res.status(400).json({ msg: 'Komentāra teksts nevar būt tukšs.' });
  }
  if (!ObjectId.isValid(itemId)) {
    return res.status(400).json({ msg: 'Nederīgs vienuma ID.' });
  }

  try {
    const db = getDB();
    const commentsCollection = db.collection('comments');
    const homeworksCollection = db.collection('homeworks');
    const testsCollection = db.collection('tests');
    const itemObjectId = new ObjectId(itemId);

    const newComment = {
      itemId: itemObjectId,
      userId: userId,
      userName: userName,
      text: text.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await commentsCollection.insertOne(newComment);
    const createdComment = await commentsCollection.findOne({ _id: result.insertedId });

    // Notify item owner if commenter is not the owner
    const item = await homeworksCollection.findOne({ _id: itemObjectId }) || await testsCollection.findOne({ _id: itemObjectId });
    if (item && item.userId.toString() !== userId.toString()) {
      const itemTypeDisplay = item.type === 'homework' ? 'mājasdarbam' : 'pārbaudes darbam';
      const notificationMessage = `${userName} pievienoja komentāru Jūsu ${itemTypeDisplay} "${item.subject}".`;
      const notificationLink = `/homework-list`; // Link to general list, specific item view would be better

      await createNotification(
        db,
        item.userId,
        'COMMENT_ON_OWNED_ITEM',
        notificationMessage,
        notificationLink,
        item._id,
        item.type
      );
    }

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
      .sort({ createdAt: 1 })
      .toArray();

    res.json(comments);

  } catch (err) {
    console.error('Error fetching comments:', err);
    res.status(500).json({ msg: 'Servera kļūda, ielādējot komentārus.' });
  }
});


// @route   DELETE api/comments/:commentId
// @desc    Delete a comment
// @access  Private (owner or admin)
router.delete('/:commentId', authMiddleware, async (req, res) => {
  const commentId = req.params.commentId;
  const userIdFromToken = new ObjectId(req.user.id);
  const userRole = req.user.role;

  if (!ObjectId.isValid(commentId)) {
    return res.status(400).json({ msg: 'Nederīgs komentāra ID.' });
  }

  try {
    const db = getDB();
    const commentsCollection = db.collection('comments');
    const commentObjectId = new ObjectId(commentId);

    const commentToDelete = await commentsCollection.findOne({ _id: commentObjectId });

    if (!commentToDelete) {
      return res.status(404).json({ msg: 'Komentārs nav atrasts.' });
    }

    // Check if the logged-in user is the owner of the comment or an admin
    if (commentToDelete.userId && commentToDelete.userId.toString() !== userIdFromToken.toString() && userRole !== 'admin') {
      return res.status(403).json({ msg: 'Jums nav tiesību dzēst šo komentāru.' });
    }

    const result = await commentsCollection.deleteOne({ _id: commentObjectId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ msg: 'Komentārs netika atrasts vai jau ir dzēsts.' });
    }

    // Also delete notifications related to this comment being replied to (if that feature exists)
    // For now, no notifications are directly tied to a commentId as relatedItemId, but rather the parent item (homework/test)
    // If a comment was a reply TO another comment, then notifications for *that* reply should be handled.
    // This simple delete just removes the comment itself.

    res.json({ msg: 'Komentārs veiksmīgi dzēsts.' });

  } catch (err) {
    console.error('Error deleting comment:', err);
    res.status(500).json({ msg: 'Servera kļūda, dzēšot komentāru.' });
  }
});


module.exports = router;