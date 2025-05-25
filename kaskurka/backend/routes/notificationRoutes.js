const express = require('express');
const router = express.Router();
const { getDB } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware'); // Autentifikācijas starpprogrammatūra.
const { ObjectId } = require('mongodb'); // MongoDB ObjectId.

// @route   GET api/notifications
// @desc    Iegūst nelasītos paziņojumus pieslēgtajam lietotājam (ierobežots skaits).
// @access  Privāts
router.get('/', authMiddleware, async (req, res) => {
  const userId = new ObjectId(req.user.id); // Lietotāja ID no pilnvaras.
  try {
    const db = getDB();
    const notificationsCollection = db.collection('notifications');
    // Atrod pēdējos 10 nelasītos paziņojumus, sakārtotus pēc izveides laika (jaunākie pirmie).
    const notifications = await notificationsCollection
      .find({ userId: userId, isRead: false })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    // Saskaita visus nelasītos paziņojumus šim lietotājam.
    const unreadCount = await notificationsCollection.countDocuments({ userId: userId, isRead: false });

    res.json({ notifications, unreadCount }); // Atgriež paziņojumus un nelasīto skaitu.
  } catch (err) {
    console.error('Kļūda, ielādējot nelasītos paziņojumus:', err);
    res.status(500).json({ msg: 'Servera kļūda, ielādējot paziņojumus.' });
  }
});

// @route   GET api/notifications/all
// @desc    Iegūst visus paziņojumus pieslēgtajam lietotājam (nākotnē ar lapošanu).
// @access  Privāts
router.get('/all', authMiddleware, async (req, res) => {
  const userId = new ObjectId(req.user.id);
  try {
    const db = getDB();
    const notificationsCollection = db.collection('notifications');
    // TODO: Nākotnē pievienot lapošanu, ja saraksts kļūst pārāk garš.
    // Pagaidām ierobežo līdz pēdējiem 50 paziņojumiem.
    const allNotifications = await notificationsCollection
      .find({ userId: userId })
      .sort({ createdAt: -1 }) // Jaunākie pirmie.
      .limit(50)
      .toArray();
    res.json(allNotifications);
  } catch (err) {
    console.error('Kļūda, ielādējot visus paziņojumus:', err);
    res.status(500).json({ msg: 'Servera kļūda, ielādējot visus paziņojumus.' });
  }
});

// @route   PUT api/notifications/:notificationId/read
// @desc    Atzīmē konkrētu paziņojumu kā izlasītu.
// @access  Privāts
router.put('/:notificationId/read', authMiddleware, async (req, res) => {
  const userId = new ObjectId(req.user.id); // Lietotāja ID.
  const notificationId = req.params.notificationId; // Paziņojuma ID no URL.

  // Pārbauda, vai paziņojuma ID ir derīgs.
  if (!ObjectId.isValid(notificationId)) {
    return res.status(400).json({ msg: 'Nederīgs paziņojuma ID.' });
  }

  try {
    const db = getDB();
    const notificationsCollection = db.collection('notifications');
    // Atjaunina paziņojumu, iestatot `isRead` uz `true` un pievienojot `readAt` laiku.
    const result = await notificationsCollection.updateOne(
      { _id: new ObjectId(notificationId), userId: userId }, // Nodrošina, ka lietotājs var atzīmēt tikai savus paziņojumus.
      { $set: { isRead: true, readAt: new Date() } }
    );

    // Ja paziņojums netika atrasts vai nepieder lietotājam.
    if (result.matchedCount === 0) {
      return res.status(404).json({ msg: 'Paziņojums nav atrasts vai nepieder Jums.' });
    }
    // Ja paziņojums tika atrasts, bet netika modificēts (jau bija izlasīts).
    if (result.modifiedCount === 0 && result.matchedCount === 1) {
      return res.json({ msg: 'Paziņojums jau bija atzīmēts kā izlasīts.' });
    }
    res.json({ msg: 'Paziņojums atzīmēts kā izlasīts.' });
  } catch (err) {
    console.error('Kļūda, atzīmējot paziņojumu kā izlasītu:', err);
    res.status(500).json({ msg: 'Servera kļūda, atzīmējot paziņojumu kā izlasītu.' });
  }
});

// @route   PUT api/notifications/read-all
// @desc    Atzīmē visus lietotāja nelasītos paziņojumus kā izlasītus.
// @access  Privāts
router.put('/read-all', authMiddleware, async (req, res) => {
  const userId = new ObjectId(req.user.id);
  try {
    const db = getDB();
    const notificationsCollection = db.collection('notifications');
    // Atjaunina visus nelasītos paziņojumus šim lietotājam.
    const result = await notificationsCollection.updateMany(
      { userId: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    res.json({ msg: `${result.modifiedCount} paziņojumi atzīmēti kā izlasīti.` });
  } catch (err) {
    console.error('Kļūda, atzīmējot visus paziņojumus kā izlasītus:', err);
    res.status(500).json({ msg: 'Servera kļūda, atzīmējot visus paziņojumus kā izlasītus.' });
  }
});


// @route   DELETE api/notifications/:notificationId
// @desc    Dzēš paziņojumu.
// @access  Privāts
router.delete('/:notificationId', authMiddleware, async (req, res) => {
  const userId = new ObjectId(req.user.id); // Lietotāja ID.
  const notificationId = req.params.notificationId; // Dzēšamā paziņojuma ID.

  if (!ObjectId.isValid(notificationId)) {
    return res.status(400).json({ msg: 'Nederīgs paziņojuma ID.' });
  }

  try {
    const db = getDB();
    const notificationsCollection = db.collection('notifications');
    // Dzēš paziņojumu, ja tas pieder lietotājam.
    const result = await notificationsCollection.deleteOne({ _id: new ObjectId(notificationId), userId: userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ msg: 'Paziņojums nav atrasts vai nepieder Jums.' });
    }
    res.json({ msg: 'Paziņojums veiksmīgi dzēsts.' });
  } catch (err) {
    console.error('Kļūda, dzēšot paziņojumu:', err);
    res.status(500).json({ msg: 'Servera kļūda, dzēšot paziņojumu.' });
  }
});


module.exports = router;