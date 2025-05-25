const express = require('express');
const router = express.Router();
const { getDB } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware'); // Autentifikācijas starpprogrammatūra.
const { ObjectId } = require('mongodb'); // MongoDB ObjectId.

// @route   POST api/progress
// @desc    Iestata vai atjaunina progresa statusu vienumam (mājasdarbam vai pārbaudes darbam).
// @access  Privāts
router.post('/', authMiddleware, async (req, res) => {
  const { itemId, status } = req.body; // `status` var būt 'done' vai 'not_done' (vai paties/aplams).
  const userId = new ObjectId(req.user.id); // Lietotāja ID.

  // Pārbauda, vai ir norādīts vienuma ID un statuss.
  if (!itemId || typeof status === 'undefined') {
    return res.status(400).json({ msg: 'Nepieciešams ID un statuss.' });
  }

  try {
    const db = getDB();
    const progressCollection = db.collection('userItemProgress'); // Kolekcija lietotāju progresam.

    // Papildu validācija (neobligāta, bet ieteicama):
    // Pārbaudīt, vai vienums ar `itemId` patiešām eksistē `homeworks` vai `tests` kolekcijā.
    // Pagaidām pieņemam, ka `itemId` ir derīgs, ja tas ir norādīts.

    const itemObjectId = new ObjectId(itemId); // Pārvērš vienuma ID par ObjectId.

    // Atjaunina vai izveido (upsert) progresa ierakstu.
    const result = await progressCollection.updateOne(
      { userId: userId, itemId: itemObjectId }, // Meklēšanas kritēriji.
      { $set: { status: status, updatedAt: new Date() } }, // Atjaunināmie lauki.
      { upsert: true } // Ja ieraksts neeksistē, to izveido.
    );

    // Pārbauda, vai ieraksts tika modificēts vai izveidots.
    if (result.modifiedCount > 0 || result.upsertedCount > 0) {
      res.json({ msg: 'Progresa statuss veiksmīgi atjaunināts.', itemId, status });
    } else {
      // Šis gadījums var notikt, ja iesniegtais statuss ir tāds pats kā jau datubāzē
      // un `upsert` nenotika. Tomēr tas joprojām ir veiksmīgs stāvokļa ziņā.
      res.json({ msg: 'Progresa statuss jau bija aktuāls.', itemId, status });
    }

  } catch (err) {
    console.error('Kļūda, atjauninot progresu:', err);
    // Specifiska kļūdas apstrāde nederīgam ObjectId formātam.
    if (err.name === 'BSONError' && err.message.includes('Argument passed in must be a string of 12 bytes or a string of 24 hex characters or an integer')) {
      return res.status(400).json({ msg: 'Nederīgs vienuma ID formāts.' });
    }
    res.status(500).json({ msg: 'Servera kļūda atjauninot progresu.' });
  }
});

// @route   GET api/progress
// @desc    Iegūst visus progresa statusus pieslēgtajam lietotājam.
// @access  Privāts
router.get('/', authMiddleware, async (req, res) => {
  const userId = new ObjectId(req.user.id); // Lietotāja ID.

  try {
    const db = getDB();
    const progressCollection = db.collection('userItemProgress');

    // Atrod visus progresa ierakstus šim lietotājam.
    const userProgress = await progressCollection.find({ userId: userId }).toArray();

    // Pārveido rezultātu par karti (map) ērtākai lietošanai lietotāja saskarnē: { itemId: status }.
    const progressMap = userProgress.reduce((acc, curr) => {
      acc[curr.itemId.toString()] = curr.status; // Atslēga ir vienuma ID (kā virkne).
      return acc;
    }, {});

    res.json(progressMap);

  } catch (err) {
    console.error('Kļūda, ielādējot progresu:', err);
    res.status(500).json({ msg: 'Servera kļūda ielādējot progresu.' });
  }
});

module.exports = router;