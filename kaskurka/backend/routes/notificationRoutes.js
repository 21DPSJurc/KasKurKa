const express = require('express');
const router = express.Router();
const { getDB } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const { ObjectId } = require('mongodb');

// @route   GET api/notifications
// @desc    Get unread notifications for the logged-in user, limited
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  const userId = new ObjectId(req.user.id);
  try {
    const db = getDB();
    const notificationsCollection = db.collection('notifications');
    const notifications = await notificationsCollection
      .find({ userId: userId, isRead: false })
      .sort({ createdAt: -1 })
      .limit(10) // Get latest 10 unread
      .toArray();

    const unreadCount = await notificationsCollection.countDocuments({ userId: userId, isRead: false });

    res.json({ notifications, unreadCount });
  } catch (err) {
    console.error('Error fetching unread notifications:', err);
    res.status(500).json({ msg: 'Servera kļūda, ielādējot paziņojumus.' });
  }
});

// @route   GET api/notifications/all
// @desc    Get all notifications for the logged-in user (paginated in future)
// @access  Private
router.get('/all', authMiddleware, async (req, res) => {
  const userId = new ObjectId(req.user.id);
  try {
    const db = getDB();
    const notificationsCollection = db.collection('notifications');
    // TODO: Add pagination in the future if list becomes too long
    const allNotifications = await notificationsCollection
      .find({ userId: userId })
      .sort({ createdAt: -1 })
      .limit(50) // Limit for now
      .toArray();
    res.json(allNotifications);
  } catch (err) {
    console.error('Error fetching all notifications:', err);
    res.status(500).json({ msg: 'Servera kļūda, ielādējot visus paziņojumus.' });
  }
});

// @route   PUT api/notifications/:notificationId/read
// @desc    Mark a specific notification as read
// @access  Private
router.put('/:notificationId/read', authMiddleware, async (req, res) => {
  const userId = new ObjectId(req.user.id);
  const notificationId = req.params.notificationId;

  if (!ObjectId.isValid(notificationId)) {
    return res.status(400).json({ msg: 'Nederīgs paziņojuma ID.' });
  }

  try {
    const db = getDB();
    const notificationsCollection = db.collection('notifications');
    const result = await notificationsCollection.updateOne(
      { _id: new ObjectId(notificationId), userId: userId },
      { $set: { isRead: true, readAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ msg: 'Paziņojums nav atrasts vai nepieder Jums.' });
    }
    if (result.modifiedCount === 0 && result.matchedCount === 1) {
      return res.json({ msg: 'Paziņojums jau bija atzīmēts kā izlasīts.' });
    }
    res.json({ msg: 'Paziņojums atzīmēts kā izlasīts.' });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ msg: 'Servera kļūda, atzīmējot paziņojumu kā izlasītu.' });
  }
});

// @route   PUT api/notifications/read-all
// @desc    Mark all unread notifications for the user as read
// @access  Private
router.put('/read-all', authMiddleware, async (req, res) => {
  const userId = new ObjectId(req.user.id);
  try {
    const db = getDB();
    const notificationsCollection = db.collection('notifications');
    const result = await notificationsCollection.updateMany(
      { userId: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    res.json({ msg: `${result.modifiedCount} paziņojumi atzīmēti kā izlasīti.` });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ msg: 'Servera kļūda, atzīmējot visus paziņojumus kā izlasītus.' });
  }
});


// @route   DELETE api/notifications/:notificationId
// @desc    Delete a notification
// @access  Private
router.delete('/:notificationId', authMiddleware, async (req, res) => {
  const userId = new ObjectId(req.user.id);
  const notificationId = req.params.notificationId;

  if (!ObjectId.isValid(notificationId)) {
    return res.status(400).json({ msg: 'Nederīgs paziņojuma ID.' });
  }

  try {
    const db = getDB();
    const notificationsCollection = db.collection('notifications');
    const result = await notificationsCollection.deleteOne({ _id: new ObjectId(notificationId), userId: userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ msg: 'Paziņojums nav atrasts vai nepieder Jums.' });
    }
    res.json({ msg: 'Paziņojums veiksmīgi dzēsts.' });
  } catch (err) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ msg: 'Servera kļūda, dzēšot paziņojumu.' });
  }
});


module.exports = router;