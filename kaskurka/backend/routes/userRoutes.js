const express = require('express');
const router = express.Router();
const { getDB } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware'); // Autentifikācijas starpprogrammatūra.
const adminMiddleware = require('../middleware/adminMiddleware'); // Administratora tiesību pārbaude.
const { ObjectId } = require('mongodb'); // MongoDB ObjectId.
const bcrypt = require('bcryptjs'); // Paroļu šifrēšanai (ja administrators maina paroli).

// @route   GET api/users
// @desc    Iegūst visus lietotājus (tikai administrators).
// @access  Privāts (Administrators)
router.get('/', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const db = getDB();
        const usersCollection = db.collection('users');
        // Atlasa visus lietotājus, izslēdzot paroles lauku, kārtotus pēc uzvārda un vārda.
        const users = await usersCollection.find({}).project({ password: 0 }).sort({ lastName: 1, firstName: 1 }).toArray();
        res.json(users);
    } catch (err) {
        console.error('Kļūda, ielādējot lietotājus:', err);
        res.status(500).json({ msg: 'Servera kļūda, ielādējot lietotājus.' });
    }
});

// @route   GET api/users/:userId
// @desc    Iegūst konkrētu lietotāju pēc ID (tikai administrators).
// @access  Privāts (Administrators)
router.get('/:userId', [authMiddleware, adminMiddleware], async (req, res) => {
    const { userId } = req.params; // Lietotāja ID no URL.
    // Pārbauda, vai ID ir derīgs ObjectId formāts.
    if (!ObjectId.isValid(userId)) {
        return res.status(400).json({ msg: 'Nederīgs lietotāja ID.' });
    }
    try {
        const db = getDB();
        const usersCollection = db.collection('users');
        // Atrod lietotāju pēc ID, izslēdzot paroles lauku.
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) }, { projection: { password: 0 } });

        if (!user) {
            return res.status(404).json({ msg: 'Lietotājs nav atrasts.' });
        }
        res.json(user);
    } catch (err) {
        console.error('Kļūda, ielādējot lietotāja datus pēc ID:', err);
        res.status(500).json({ msg: 'Servera kļūda, ielādējot lietotāja datus.' });
    }
});

// @route   PUT api/users/:userId
// @desc    Atjaunina lietotāja datus (tikai administrators).
// @access  Privāts (Administrators)
router.put('/:userId', [authMiddleware, adminMiddleware], async (req, res) => {
    const { userId } = req.params;
    // `subgroup` lauks ir noņemts.
    const { firstName, lastName, email, role, studyStartYear, group, newPassword } = req.body;

    if (!ObjectId.isValid(userId)) {
        return res.status(400).json({ msg: 'Nederīgs lietotāja ID.' });
    }

    // Pamata validācija.
    if (!firstName || !lastName || !email || !role || !studyStartYear || !group) {
        return res.status(400).json({ msg: 'Lūdzu, aizpildiet visus obligātos laukus (Vārds, Uzvārds, E-pasts, Loma, Mācību s. gads, Grupa).' });
    }
    if (!['student', 'admin'].includes(role)) {
        return res.status(400).json({ msg: 'Nederīga loma. Atļautās lomas: student, admin.' });
    }
    // Paroles sarežģītības pārbaude, ja tiek norādīta jauna parole.
    if (newPassword) {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                msg: "Jaunajai parolei jābūt vismaz 8 rakstzīmes garai un jāsatur vismaz viens lielais burts, viens mazais burts un viens cipars."
            });
        }
    }


    try {
        const db = getDB();
        const usersCollection = db.collection('users');
        const userObjectId = new ObjectId(userId);

        // Atrod lietotāju, kuru paredzēts atjaunināt.
        const userToUpdate = await usersCollection.findOne({ _id: userObjectId });
        if (!userToUpdate) {
            return res.status(404).json({ msg: 'Lietotājs nav atrasts.' });
        }

        // Pārbauda, vai jaunais e-pasts (ja mainīts) nekonfliktē ar citu esošu lietotāju.
        const conflictingUser = await usersCollection.findOne({
            email: email.toLowerCase(),
            _id: { $ne: userObjectId } // Izslēdz pašu rediģējamo lietotāju.
        });
        if (conflictingUser) {
            return res.status(400).json({ msg: 'Lietotājs ar šādu e-pastu jau eksistē.' });
        }

        // Sagatavo laukus atjaunināšanai.
        const updateFields = {
            firstName,
            lastName,
            email: email.toLowerCase(),
            role,
            studyStartYear: parseInt(studyStartYear, 10),
            group,
            // `subgroup` lauks noņemts.
            updatedAt: new Date(),
        };

        // Nodrošina, ka `subgroup` lauks tiek noņemts, ja tas eksistē vecajā dokumentā.
        if (Object.prototype.hasOwnProperty.call(userToUpdate, 'subgroup')) {
            updateFields.$unset = { subgroup: "" };
        }


        // Ja norādīta jauna parole, to šifrē un pievieno atjaunināmajiem laukiem.
        if (newPassword) {
            const salt = await bcrypt.genSalt(10);
            updateFields.password = await bcrypt.hash(newPassword, salt);
        }


        // Atjaunina lietotāja datus datubāzē.
        const result = await usersCollection.updateOne(
            { _id: userObjectId },
            { $set: updateFields }
        );

        if (result.matchedCount === 0) {
            // Maz ticams, ja `userToUpdate` tika atrasts.
            return res.status(404).json({ msg: 'Lietotājs netika atrasts atjaunināšanai.' });
        }

        // Iegūst atjaunināto lietotāju (bez paroles) atbildes nosūtīšanai.
        const updatedUser = await usersCollection.findOne({ _id: userObjectId }, { projection: { password: 0 } });
        res.json({ msg: 'Lietotāja dati veiksmīgi atjaunināti!', user: updatedUser });

    } catch (err) {
        console.error('Kļūda, atjauninot lietotāju:', err);
        res.status(500).json({ msg: 'Servera kļūda, atjauninot lietotāja datus.' });
    }
});

// @route   DELETE api/users/:userId
// @desc    Dzēš lietotāju (tikai administrators).
// @access  Privāts (Administrators)
router.delete('/:userId', [authMiddleware, adminMiddleware], async (req, res) => {
    const { userId } = req.params; // Dzēšamā lietotāja ID.

    if (!ObjectId.isValid(userId)) {
        return res.status(400).json({ msg: 'Nederīgs lietotāja ID.' });
    }
    const adminUserId = req.user.id; // Administratora ID, kas veic darbību.

    // Pārbauda, vai administrators nemēģina dzēst pats sevi.
    if (userId === adminUserId) {
        return res.status(400).json({ msg: 'Administrators nevar dzēst pats sevi.' });
    }

    try {
        const db = getDB();
        const usersCollection = db.collection('users');
        const userObjectId = new ObjectId(userId);

        // Atrod dzēšamo lietotāju.
        const userToDelete = await usersCollection.findOne({ _id: userObjectId });
        if (!userToDelete) {
            return res.status(404).json({ msg: 'Lietotājs nav atrasts.' });
        }

        // Iespējamās kaskādes dzēšanas vai "attīrīšanas" darbības:
        // 1. Noņemt lietotāju no `group.members` masīviem.
        await db.collection('groups').updateMany(
            { members: userObjectId },
            { $pull: { members: userObjectId } }
        );
        // 2. Dzēst lietotāja grupu pieteikumus.
        await db.collection('groupApplications').deleteMany({ userId: userObjectId });
        // 3. Dzēst lietotāja vienumu progresu.
        await db.collection('userItemProgress').deleteMany({ userId: userObjectId });
        // 4. Apstrādāt lietotāja komentārus (piem., anonimizēt, atzīmēt kā dzēsta lietotāja komentārus vai dzēst).
        // Pagaidām anonimizējam, nomainot `userName` un saglabājot sākotnējo ID, `userId` iestatot uz `null`.
        await db.collection('comments').updateMany(
            { userId: userObjectId },
            { $set: { userName: `${userToDelete.firstName} (Dzēsts Lietotājs)`, originalUserId: userToDelete._id, userId: null } }
        );
        // 5. Apstrādāt lietotāja izveidotos mājasdarbus/pārbaudes darbus (piem., piešķirt vispārīgam administratoram, atzīmēt kā "bāreņus" vai dzēst).
        // Pagaidām pieņemam, ka lietotāju izveidotais saturs paliek, attiecināts uz viņu vārdu.
        // Ja nepieciešama stingrāka dzēšana, tas būtu sarežģītāk.


        // Dzēš pašu lietotāju.
        const deleteResult = await usersCollection.deleteOne({ _id: userObjectId });
        if (deleteResult.deletedCount === 0) {
            // Maz ticams, ja `userToDelete` tika atrasts.
            return res.status(404).json({ msg: 'Lietotāju neizdevās dzēst vai tas jau ir dzēsts.' });
        }

        res.json({ msg: `Lietotājs ${userToDelete.firstName} ${userToDelete.lastName} veiksmīgi dzēsts.` });

    } catch (err) {
        console.error('Kļūda, dzēšot lietotāju:', err);
        res.status(500).json({ msg: 'Servera kļūda, dzēšot lietotāju.' });
    }
});


module.exports = router;