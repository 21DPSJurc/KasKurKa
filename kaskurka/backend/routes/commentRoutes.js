const express = require('express');
const router = express.Router();
const { getDB } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware'); // Autentifikācijas starpprogrammatūra.
const { ObjectId } = require('mongodb'); // MongoDB ObjectId konvertācijai.

// Palīgfunkcija paziņojumu izveidei.
// Vēlāk var tikt pārvietota uz atsevišķu servisa moduli.
async function createNotification(db, recipientUserId, type, message, link, relatedItemId, relatedItemType) {
  try {
    const notificationsCollection = db.collection('notifications');
    await notificationsCollection.insertOne({
      userId: recipientUserId, // Paziņojuma saņēmēja ID.
      type: type, // Paziņojuma tips (piem., 'NEW_COMMENT').
      message: message, // Paziņojuma teksts.
      link: link || null, // Saite, uz kuru novirzīt lietotāju (neobligāti).
      isRead: false, // Sākotnēji paziņojums nav izlasīts.
      createdAt: new Date(), // Izveides laiks.
      relatedItemId: relatedItemId ? new ObjectId(relatedItemId) : null, // Saistītā vienuma ID (piem., mājasdarba ID).
      relatedItemType: relatedItemType || null, // Saistītā vienuma tips (piem., 'homework', 'test').
    });
  } catch (error) {
    console.error(`Kļūda, veidojot paziņojumu lietotājam ${recipientUserId}:`, error);
  }
}

// @route   POST api/comments/:itemId
// @desc    Pievieno komentāru vienumam (mājasdarbam vai pārbaudes darbam).
// @access  Privāts (nepieciešama autorizācija)
router.post('/:itemId', authMiddleware, async (req, res) => {
  const { text } = req.body; // Komentāra teksts no pieprasījuma ķermeņa.
  const itemId = req.params.itemId; // Vienuma ID no URL parametriem.
  const userId = new ObjectId(req.user.id); // Komentētāja ID no autentifikācijas pilnvaras.
  const userName = req.user.firstName; // Komentētāja vārds.

  // Pārbauda, vai komentāra teksts nav tukšs.
  if (!text || text.trim() === '') {
    return res.status(400).json({ msg: 'Komentāra teksts nevar būt tukšs.' });
  }
  // Pārbauda, vai vienuma ID ir derīgs ObjectId formāts.
  if (!ObjectId.isValid(itemId)) {
    return res.status(400).json({ msg: 'Nederīgs vienuma ID.' });
  }

  try {
    const db = getDB();
    const commentsCollection = db.collection('comments');
    const homeworksCollection = db.collection('homeworks');
    const testsCollection = db.collection('tests');
    const itemObjectId = new ObjectId(itemId); // Pārvērš vienuma ID par ObjectId.

    // Izveido jauna komentāra objektu.
    const newComment = {
      itemId: itemObjectId, // Saistītā vienuma ID.
      userId: userId, // Autora ID.
      userName: userName, // Autora vārds (ērtībai).
      text: text.trim(), // Komentāra teksts (bez liekām atstarpēm).
      createdAt: new Date(), // Izveides laiks.
      updatedAt: new Date(), // Atjaunināšanas laiks (sākotnēji vienāds ar izveides laiku).
    };

    // Ievieto jauno komentāru datubāzē.
    const result = await commentsCollection.insertOne(newComment);
    // Atrod tikko izveidoto komentāru, lai to atgrieztu atbildē.
    const createdComment = await commentsCollection.findOne({ _id: result.insertedId });

    // Nosūta paziņojumu vienuma īpašniekam, ja komentētājs nav īpašnieks.
    const item = await homeworksCollection.findOne({ _id: itemObjectId }) || await testsCollection.findOne({ _id: itemObjectId });
    if (item && item.userId.toString() !== userId.toString()) {
      const itemTypeDisplay = item.type === 'homework' ? 'mājasdarbam' : 'pārbaudes darbam';
      const notificationMessage = `${userName} pievienoja komentāru Jūsu ${itemTypeDisplay} "${item.subject}".`;
      // TODO: Saitei vajadzētu vest uz konkrēto vienumu, nevis vispārīgu sarakstu.
      const notificationLink = `/homework-list`;

      await createNotification(
        db,
        item.userId, // Vienuma īpašnieka ID.
        'COMMENT_ON_OWNED_ITEM', // Paziņojuma tips.
        notificationMessage,
        notificationLink,
        item._id, // Saistītā vienuma ID (mājasdarbs/pārbaudes darbs).
        item.type // Saistītā vienuma tips.
      );
    }

    res.status(201).json({ msg: 'Komentārs veiksmīgi pievienots!', comment: createdComment });

  } catch (err) {
    console.error('Kļūda, pievienojot komentāru:', err);
    res.status(500).json({ msg: 'Servera kļūda, pievienojot komentāru.' });
  }
});

// @route   GET api/comments/:itemId
// @desc    Iegūst visus komentārus konkrētam vienumam.
// @access  Privāts
router.get('/:itemId', authMiddleware, async (req, res) => {
  const itemId = req.params.itemId;
  // Pārbauda, vai vienuma ID ir derīgs ObjectId formāts.
  if (!ObjectId.isValid(itemId)) {
    return res.status(400).json({ msg: 'Nederīgs vienuma ID.' });
  }

  try {
    const db = getDB();
    const commentsCollection = db.collection('comments');

    // Atrod visus komentārus, kas saistīti ar konkrēto vienuma ID, sakārtotus pēc izveides laika.
    const comments = await commentsCollection
      .find({ itemId: new ObjectId(itemId) })
      .sort({ createdAt: 1 }) // Vecākie komentāri pirmie.
      .toArray();

    res.json(comments);

  } catch (err) {
    console.error('Kļūda, ielādējot komentārus:', err);
    res.status(500).json({ msg: 'Servera kļūda, ielādējot komentārus.' });
  }
});


// @route   DELETE api/comments/:commentId
// @desc    Dzēš komentāru.
// @access  Privāts (tikai komentāra īpašnieks vai administrators)
router.delete('/:commentId', authMiddleware, async (req, res) => {
  const commentId = req.params.commentId; // Komentāra ID no URL.
  const userIdFromToken = new ObjectId(req.user.id); // Pašreizējā lietotāja ID.
  const userRole = req.user.role; // Pašreizējā lietotāja loma.

  // Pārbauda, vai komentāra ID ir derīgs.
  if (!ObjectId.isValid(commentId)) {
    return res.status(400).json({ msg: 'Nederīgs komentāra ID.' });
  }

  try {
    const db = getDB();
    const commentsCollection = db.collection('comments');
    const commentObjectId = new ObjectId(commentId);

    // Atrod komentāru, kuru paredzēts dzēst.
    const commentToDelete = await commentsCollection.findOne({ _id: commentObjectId });

    if (!commentToDelete) {
      return res.status(404).json({ msg: 'Komentārs nav atrasts.' });
    }

    // Pārbauda, vai pieslēgtais lietotājs ir komentāra īpašnieks vai administrators.
    if (commentToDelete.userId && commentToDelete.userId.toString() !== userIdFromToken.toString() && userRole !== 'admin') {
      return res.status(403).json({ msg: 'Jums nav tiesību dzēst šo komentāru.' });
    }

    // Dzēš komentāru.
    const result = await commentsCollection.deleteOne({ _id: commentObjectId });

    if (result.deletedCount === 0) {
      // Šis gadījums ir maz ticams, ja `commentToDelete` tika atrasts, bet kā papildu drošība.
      return res.status(404).json({ msg: 'Komentārs netika atrasts vai jau ir dzēsts.' });
    }

    // TODO: Ja būtu atbildes uz komentāriem, šeit būtu jādzēš arī ar tām saistītie paziņojumi.
    // Pašreiz paziņojumi ir saistīti ar galveno vienumu (mājasdarbu/pārbaudes darbu), nevis tieši ar komentāru ID.

    res.json({ msg: 'Komentārs veiksmīgi dzēsts.' });

  } catch (err) {
    console.error('Kļūda, dzēšot komentāru:', err);
    res.status(500).json({ msg: 'Servera kļūda, dzēšot komentāru.' });
  }
});


module.exports = router;