const express = require('express');
const router = express.Router();
const { getDB } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware'); // Autentifikācijas starpprogrammatūra.
const adminMiddleware = require('../middleware/adminMiddleware'); // Administratora tiesību pārbaudes starpprogrammatūra.
const { ObjectId } = require('mongodb'); // MongoDB ObjectId.

// Palīgfunkcija paziņojumu izveidei.
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
        console.error(`Kļūda, veidojot paziņojumu lietotājam ${recipientUserId}:`, error);
    }
}


// @route   POST api/groups
// @desc    Izveido jaunu grupu (tikai administrators).
// @access  Privāts (Administrators)
router.post('/', [authMiddleware, adminMiddleware], async (req, res) => {
    const { name, description, studyYear } = req.body; // Iegūst datus no pieprasījuma.

    // Pārbauda, vai grupas nosaukums ir obligāts un nav tukšs.
    if (!name || name.trim() === '') {
        return res.status(400).json({ msg: 'Grupas nosaukums ir obligāts lauks.' });
    }
    // Pārbauda nosaukuma garumu.
    if (name.length > 50) {
        return res.status(400).json({ msg: 'Grupas nosaukums nedrīkst pārsniegt 50 rakstzīmes.' });
    }
    // Pārbauda apraksta garumu, ja tas ir norādīts.
    if (description && description.length > 255) {
        return res.status(400).json({ msg: 'Grupas apraksts nedrīkst pārsniegt 255 rakstzīmes.' });
    }
    // Pārbauda mācību gada garumu, ja tas ir norādīts.
    if (studyYear && studyYear.length > 9) {
        return res.status(400).json({ msg: 'Mācību gads nedrīkst pārsniegt 9 rakstzīmes.' });
    }

    try {
        const db = getDB();
        const groupsCollection = db.collection('groups');
        // Pārbauda, vai grupa ar šādu nosaukumu (ignorējot reģistru) jau eksistē.
        const existingGroup = await groupsCollection.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' } });
        if (existingGroup) {
            return res.status(400).json({ msg: 'Grupa ar šādu nosaukumu jau eksistē.' });
        }

        // Izveido jaunas grupas objektu.
        const newGroup = {
            name: name.trim(), // Noņem liekās atstarpes no nosaukuma.
            description: description ? description.trim() : '', // Noņem liekās atstarpes no apraksta.
            studyYear: studyYear ? studyYear.trim() : '', // Noņem liekās atstarpes no mācību gada.
            adminCreatorId: new ObjectId(req.user.id), // Administratora, kas izveidoja grupu, ID.
            createdAt: new Date(), // Izveides laiks.
            updatedAt: new Date(), // Atjaunināšanas laiks (sākotnēji vienāds ar izveides laiku).
            members: [], // Sākotnēji grupā nav dalībnieku.
        };

        // Ievieto jauno grupu datubāzē.
        const result = await groupsCollection.insertOne(newGroup);
        // Atrod tikko izveidoto grupu, lai to atgrieztu atbildē.
        const createdGroup = await groupsCollection.findOne({ _id: result.insertedId });
        res.status(201).json({ msg: 'Grupa veiksmīgi izveidota!', group: createdGroup });
    } catch (err) {
        console.error('Kļūda, veidojot grupu:', err);
        res.status(500).json({ msg: 'Servera kļūda, veidojot grupu.' });
    }
});

// @route   GET api/groups
// @desc    Iegūst visas pieejamās grupas (visiem autentificētiem lietotājiem, lai redzētu un pieteiktos).
// @access  Privāts (Visi autentificēti lietotāji)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const db = getDB();
        const groupsCollection = db.collection('groups');
        // Atrod visas grupas, sakārtotas pēc nosaukuma.
        const groups = await groupsCollection.find({}).sort({ name: 1 }).toArray();
        res.json(groups);
    } catch (err) {
        console.error('Kļūda, ielādējot grupas:', err);
        res.status(500).json({ msg: 'Servera kļūda, ielādējot grupas.' });
    }
});

// @route   GET api/groups/details/:groupId
// @desc    Iegūst detalizētu informāciju par konkrētu grupu (tikai administrators, rediģēšanas nolūkiem).
// @access  Privāts (Administrators)
router.get('/details/:groupId', [authMiddleware, adminMiddleware], async (req, res) => {
    const { groupId } = req.params;
    // Pārbauda, vai grupas ID ir derīgs.
    if (!ObjectId.isValid(groupId)) {
        return res.status(400).json({ msg: 'Nederīgs grupas ID.' });
    }
    try {
        const db = getDB();
        const groupsCollection = db.collection('groups');
        // Atrod grupu pēc ID.
        const group = await groupsCollection.findOne({ _id: new ObjectId(groupId) });
        if (!group) {
            return res.status(404).json({ msg: 'Grupa nav atrasta.' });
        }
        res.json(group);
    } catch (error) {
        console.error('Kļūda, ielādējot grupas datus administratoram:', error);
        res.status(500).json({ msg: 'Servera kļūda, ielādējot grupas datus.' });
    }
});

// @route   PUT api/groups/:groupId
// @desc    Atjaunina grupu (tikai administrators).
// @access  Privāts (Administrators)
router.put('/:groupId', [authMiddleware, adminMiddleware], async (req, res) => {
    const { groupId } = req.params;
    const { name, description, studyYear } = req.body;

    // Pārbauda, vai grupas ID ir derīgs.
    if (!ObjectId.isValid(groupId)) {
        return res.status(400).json({ msg: 'Nederīgs grupas ID.' });
    }

    // Validācijas, līdzīgas kā grupas izveidē.
    if (!name || name.trim() === '') {
        return res.status(400).json({ msg: 'Grupas nosaukums ir obligāts lauks.' });
    }
    if (name.length > 50) {
        return res.status(400).json({ msg: 'Grupas nosaukums nedrīkst pārsniegt 50 rakstzīmes.' });
    }
    if (description && description.length > 255) {
        return res.status(400).json({ msg: 'Grupas apraksts nedrīkst pārsniegt 255 rakstzīmes.' });
    }
    if (studyYear && studyYear.length > 9) {
        return res.status(400).json({ msg: 'Mācību gads nedrīkst pārsniegt 9 rakstzīmes.' });
    }

    try {
        const db = getDB();
        const groupsCollection = db.collection('groups');
        const groupObjectId = new ObjectId(groupId);

        // Pārbauda, vai rediģējamā grupa eksistē.
        const existingGroup = await groupsCollection.findOne({ _id: groupObjectId });
        if (!existingGroup) {
            return res.status(404).json({ msg: 'Grupa nav atrasta.' });
        }

        // Pārbauda, vai jaunais nosaukums (ja mainīts) jau neeksistē citai grupai.
        const conflictingGroup = await groupsCollection.findOne({
            name: { $regex: `^${name.trim()}$`, $options: 'i' }, // Ignorē reģistru.
            _id: { $ne: groupObjectId } // Izslēdz pašu rediģējamo grupu no pārbaudes.
        });
        if (conflictingGroup) {
            return res.status(400).json({ msg: 'Grupa ar šādu nosaukumu jau eksistē.' });
        }

        // Sagatavo laukus atjaunināšanai.
        const updateFields = {
            name: name.trim(),
            // Ja apraksts nav norādīts, saglabā esošo.
            description: description ? description.trim() : existingGroup.description,
            // Ja mācību gads nav norādīts, saglabā esošo.
            studyYear: studyYear ? studyYear.trim() : existingGroup.studyYear,
            updatedAt: new Date(), // Atjaunina pēdējās modificēšanas laiku.
        };

        // Atjaunina grupu datubāzē.
        const result = await groupsCollection.updateOne(
            { _id: groupObjectId },
            { $set: updateFields }
        );

        if (result.matchedCount === 0) {
            // Teorētiski nevajadzētu notikt, ja `existingGroup` tika atrasta.
            return res.status(404).json({ msg: 'Grupa netika atrasta atjaunināšanai.' });
        }

        // Atrod atjaunināto grupu, lai to atgrieztu.
        const updatedGroup = await groupsCollection.findOne({ _id: groupObjectId });
        res.json({ msg: 'Grupa veiksmīgi atjaunināta!', group: updatedGroup });

    } catch (error) {
        console.error('Kļūda, atjauninot grupu:', error);
        res.status(500).json({ msg: 'Servera kļūda, atjauninot grupu.' });
    }
});

// @route   DELETE api/groups/:groupId
// @desc    Dzēš grupu (tikai administrators).
// @access  Privāts (Administrators)
router.delete('/:groupId', [authMiddleware, adminMiddleware], async (req, res) => {
    const { groupId } = req.params;

    if (!ObjectId.isValid(groupId)) {
        return res.status(400).json({ msg: 'Nederīgs grupas ID.' });
    }

    try {
        const db = getDB();
        const groupsCollection = db.collection('groups');
        const groupApplicationsCollection = db.collection('groupApplications');
        const usersCollection = db.collection('users');
        const notificationsCollection = db.collection('notifications');
        const groupObjectId = new ObjectId(groupId);

        // Atrod dzēšamo grupu.
        const groupToDelete = await groupsCollection.findOne({ _id: groupObjectId });
        if (!groupToDelete) {
            return res.status(404).json({ msg: 'Grupa nav atrasta.' });
        }

        // Paziņo dalībniekiem pirms viņu noņemšanas.
        if (groupToDelete.members && groupToDelete.members.length > 0) {
            const message = `Jūs tikāt noņemts no grupas '${groupToDelete.name}', jo grupa tika dzēsta.`;
            for (const memberId of groupToDelete.members) {
                await createNotification(db, memberId, 'GROUP_DELETED_MEMBER', message, '/dashboard', groupObjectId, 'group');
            }
        }

        // Veic dzēšanas operācijas.
        await groupsCollection.deleteOne({ _id: groupObjectId }); // Dzēš pašu grupu.
        await groupApplicationsCollection.deleteMany({ groupId: groupObjectId }); // Dzēš visus pieteikumus šai grupai.
        // Noņem šo grupu no visu lietotāju `enrolledCustomGroups` saraksta.
        await usersCollection.updateMany(
            { enrolledCustomGroups: groupObjectId },
            { $pull: { enrolledCustomGroups: groupObjectId } }
        );
        // Dzēš paziņojumus, kas saistīti ar šo grupu (piem., pieteikuma apstiprinājumi).
        await notificationsCollection.deleteMany({ relatedItemId: groupObjectId, relatedItemType: 'group' });


        res.json({ msg: 'Grupa un saistītie pieteikumi veiksmīgi dzēsti. Grupa noņemta no lietotāju profiliem.' });

    } catch (error) {
        console.error('Kļūda, dzēšot grupu:', error);
        res.status(500).json({ msg: 'Servera kļūda, dzēšot grupu.' });
    }
});


// @route   POST api/groups/:groupId/apply
// @desc    Pieteikties dalībai grupā.
// @access  Privāts (Studenti)
router.post('/:groupId/apply', authMiddleware, async (req, res) => {
    const groupId = req.params.groupId;
    const userId = new ObjectId(req.user.id);
    const userFirstName = req.user.firstName;
    const userEmail = req.user.email;
    const { message } = req.body; // Pievienotā ziņa pieteikumam (neobligāta).

    if (!ObjectId.isValid(groupId)) {
        return res.status(400).json({ msg: 'Nederīgs grupas ID.' });
    }
    // Pārbauda ziņas garumu.
    if (message && message.length > 500) {
        return res.status(400).json({ msg: 'Pieteikuma ziņa nedrīkst pārsniegt 500 rakstzīmes.' });
    }

    try {
        const db = getDB();
        const groupsCollection = db.collection('groups');
        const groupApplicationsCollection = db.collection('groupApplications');
        const usersCollection = db.collection('users');
        const groupObjectId = new ObjectId(groupId);

        // Pārbauda, vai grupa eksistē.
        const group = await groupsCollection.findOne({ _id: groupObjectId });
        if (!group) {
            return res.status(404).json({ msg: 'Grupa nav atrasta.' });
        }

        // Pārbauda, vai lietotājs jau nav šīs grupas dalībnieks (no lietotāja dokumenta).
        const userDoc = await usersCollection.findOne({ _id: userId });
        if (userDoc && userDoc.enrolledCustomGroups && userDoc.enrolledCustomGroups.some(gId => gId.equals(groupObjectId))) {
            return res.status(400).json({ msg: 'Jūs jau esat šīs grupas dalībnieks.' });
        }
        // Papildu pārbaude no pašas grupas dalībnieku saraksta (dublējoša, bet drošībai).
        if (group.members && group.members.some(memberId => memberId.equals(userId))) {
            return res.status(400).json({ msg: 'Jūs jau esat šīs grupas dalībnieks (pārbaudīts grupas sarakstā).' });
        }


        // Pārbauda, vai lietotājam jau nav aktīvs ('pending' vai 'approved') pieteikums šai grupai.
        const existingApplication = await groupApplicationsCollection.findOne({
            groupId: groupObjectId,
            userId: userId,
            status: { $in: ['pending', 'approved'] } // Pārbauda abus statusus.
        });

        if (existingApplication) {
            if (existingApplication.status === 'pending') {
                return res.status(400).json({ msg: 'Jūsu pieteikums šai grupai jau ir reģistrēts un gaida apstiprinājumu.' });
            } else if (existingApplication.status === 'approved') {
                // Šis gadījums nozīmē, ka lietotājs ir apstiprināts, bet vēl nav `enrolledCustomGroups` vai `group.members`.
                // Tas varētu būt datu nesakritības dēļ, bet labāk to traktēt kā jau dalībnieku.
                return res.status(400).json({ msg: 'Jūs jau esat apstiprināts šai grupai.' });
            }
        }

        // Izveido jaunu pieteikuma objektu.
        const newApplication = {
            groupId: groupObjectId,
            userId: userId,
            userFirstName: userFirstName, // Saglabā vārdu ērtākai attēlošanai administratoram.
            userEmail: userEmail, // Saglabā e-pastu.
            message: message ? message.trim() : '', // Pievienotā ziņa.
            status: 'pending', // Sākotnējais statuss.
            appliedAt: new Date(), // Pieteikšanās laiks.
            groupName: group.name // Saglabā grupas nosaukumu pieteikumā ērtībai.
        };
        // Ievieto pieteikumu datubāzē.
        await groupApplicationsCollection.insertOne(newApplication);
        res.status(201).json({ msg: 'Pieteikums grupai veiksmīgi nosūtīts!' });
    } catch (err) {
        console.error('Kļūda, piesakoties grupai:', err);
        res.status(500).json({ msg: 'Servera kļūda, piesakoties grupai.' });
    }
});

// @route   GET api/groups/applications/my
// @desc    Iegūst visus pieteikumus pašreizējam pieslēgtajam lietotājam.
// @access  Privāts
router.get('/applications/my', authMiddleware, async (req, res) => {
    const userId = new ObjectId(req.user.id); // Lietotāja ID no pilnvaras.
    try {
        const db = getDB();
        const groupApplicationsCollection = db.collection('groupApplications');
        // Izmanto agregāciju, lai pievienotu grupas nosaukumu katram pieteikumam.
        const applications = await groupApplicationsCollection.aggregate([
            { $match: { userId: userId } }, // Atlasa tikai šī lietotāja pieteikumus.
            {
                $lookup: { // Savieno ar 'groups' kolekciju.
                    from: 'groups',
                    localField: 'groupId',
                    foreignField: '_id',
                    as: 'groupInfo' // Rezultātu masīvs.
                }
            },
            { $unwind: { path: "$groupInfo", preserveNullAndEmptyArrays: true } }, // Pārvērš `groupInfo` masīvu par objektu; saglabā pieteikumu, ja grupa dzēsta.
            {
                $project: { // Atlasa nepieciešamos laukus.
                    _id: 1, groupId: 1, groupName: '$groupInfo.name', status: 1,
                    appliedAt: 1, message: 1, userFirstName: 1, userEmail: 1
                }
            },
            { $sort: { appliedAt: -1 } } // Kārto pēc pieteikšanās laika (jaunākie pirmie).
        ]).toArray();
        res.json(applications);
    } catch (err) {
        console.error('Kļūda, ielādējot lietotāja pieteikumus:', err);
        res.status(500).json({ msg: 'Servera kļūda, ielādējot pieteikumus.' });
    }
});

// @route   GET api/groups/applications
// @desc    Iegūst visus grupu pieteikumus (administratoram, var filtrēt pēc statusa un grupas ID).
// @access  Privāts (Administrators)
router.get('/applications', [authMiddleware, adminMiddleware], async (req, res) => {
    const { status, groupId } = req.query; // Filtri no vaicājuma parametriem.
    try {
        const db = getDB();
        const groupApplicationsCollection = db.collection('groupApplications');
        const query = {}; // Vaicājuma objekts.
        if (status) query.status = status; // Pievieno statusa filtru.
        if (groupId && ObjectId.isValid(groupId)) query.groupId = new ObjectId(groupId); // Pievieno grupas ID filtru.

        // Līdzīgi kā iepriekš, izmanto agregāciju, lai iegūtu papildu informāciju.
        const applications = await groupApplicationsCollection.aggregate([
            { $match: query },
            {
                $lookup: {
                    from: 'groups', localField: 'groupId', foreignField: '_id', as: 'groupDetails'
                }
            },
            { $unwind: { path: "$groupDetails", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1, groupId: 1,
                    // Ja grupa ir dzēsta, izmanto pieteikumā saglabāto nosaukumu.
                    groupName: { $ifNull: ['$groupDetails.name', '$groupName'] },
                    userId: 1, userFirstName: 1, userEmail: 1, message: 1,
                    status: 1, appliedAt: 1
                }
            },
            { $sort: { appliedAt: -1 } }
        ]).toArray();
        res.json(applications);
    } catch (err) {
        console.error('Kļūda, ielādējot grupu pieteikumus administratoram:', err);
        res.status(500).json({ msg: 'Servera kļūda, ielādējot grupu pieteikumus.' });
    }
});

// @route   PUT api/groups/applications/:applicationId/approve
// @desc    Apstiprina grupas pieteikumu (tikai administrators).
// @access  Privāts (Administrators)
router.put('/applications/:applicationId/approve', [authMiddleware, adminMiddleware], async (req, res) => {
    const applicationId = req.params.applicationId;
    if (!ObjectId.isValid(applicationId)) {
        return res.status(400).json({ msg: 'Nederīgs pieteikuma ID.' });
    }
    try {
        const db = getDB();
        const groupApplicationsCollection = db.collection('groupApplications');
        const groupsCollection = db.collection('groups');
        const usersCollection = db.collection('users');
        const appObjectId = new ObjectId(applicationId);

        // Atrod pieteikumu.
        const application = await groupApplicationsCollection.findOne({ _id: appObjectId });
        if (!application) {
            return res.status(404).json({ msg: 'Pieteikums nav atrasts.' });
        }
        // Pārbauda, vai pieteikums joprojām ir 'pending' statusā.
        if (application.status !== 'pending') {
            return res.status(400).json({ msg: `Pieteikums jau ir ticis '${application.status}'.` });
        }

        // Pārbauda, vai grupa, kurai pieteikums ir, joprojām eksistē.
        const groupToJoin = await groupsCollection.findOne({ _id: application.groupId });
        if (!groupToJoin) {
            // Ja grupa neeksistē, pieteikums tiek automātiski noraidīts.
            await groupApplicationsCollection.updateOne(
                { _id: appObjectId },
                { $set: { status: 'rejected', processedAt: new Date(), processedBy: new ObjectId(req.user.id), reason: 'Grupa vairs neeksistē' } }
            );
            // Paziņo lietotājam.
            await createNotification(db, application.userId, 'GROUP_APPLICATION_REJECTED', `Jūsu pieteikums grupai '${application.groupName || 'Nezināma grupa'}' tika noraidīts, jo grupa vairs neeksistē.`, '/grupas', application.groupId, 'group');
            return res.status(404).json({ msg: 'Nevar apstiprināt pieteikumu: Grupa vairs neeksistē. Pieteikums automātiski noraidīts.' });
        }

        // Atjaunina pieteikuma statusu.
        await groupApplicationsCollection.updateOne(
            { _id: appObjectId },
            { $set: { status: 'approved', processedAt: new Date(), processedBy: new ObjectId(req.user.id) } }
        );
        // Pievieno lietotāju grupas `members` sarakstam.
        await groupsCollection.updateOne(
            { _id: application.groupId },
            { $addToSet: { members: application.userId } } // `$addToSet` nodrošina, ka ID netiek dublēts.
        );
        // Pievieno grupas ID lietotāja `enrolledCustomGroups` sarakstam.
        await usersCollection.updateOne(
            { _id: application.userId },
            { $addToSet: { enrolledCustomGroups: application.groupId } }
        );

        // Paziņo lietotājam par apstiprinājumu.
        const message = `Jūsu pieteikums grupai '${groupToJoin.name}' ir apstiprināts.`;
        await createNotification(db, application.userId, 'GROUP_APPLICATION_APPROVED', message, `/grupas`, application.groupId, 'group');

        res.json({ msg: 'Pieteikums veiksmīgi apstiprināts. Lietotājs pievienots grupai.' });
    } catch (err) {
        console.error('Kļūda, apstiprinot grupas pieteikumu:', err);
        res.status(500).json({ msg: 'Servera kļūda, apstiprinot pieteikumu.' });
    }
});

// @route   PUT api/groups/applications/:applicationId/reject
// @desc    Noraida grupas pieteikumu (tikai administrators).
// @access  Privāts (Administrators)
router.put('/applications/:applicationId/reject', [authMiddleware, adminMiddleware], async (req, res) => {
    const applicationId = req.params.applicationId;
    if (!ObjectId.isValid(applicationId)) {
        return res.status(400).json({ msg: 'Nederīgs pieteikuma ID.' });
    }
    try {
        const db = getDB();
        const groupApplicationsCollection = db.collection('groupApplications');
        const appObjectId = new ObjectId(applicationId);

        const application = await groupApplicationsCollection.findOne({ _id: appObjectId });
        if (!application) {
            return res.status(404).json({ msg: 'Pieteikums nav atrasts.' });
        }
        if (application.status !== 'pending') {
            return res.status(400).json({ msg: `Pieteikums jau ir ticis '${application.status}'.` });
        }
        // Atjaunina pieteikuma statusu uz 'rejected'.
        await groupApplicationsCollection.updateOne(
            { _id: appObjectId },
            { $set: { status: 'rejected', processedAt: new Date(), processedBy: new ObjectId(req.user.id) } }
        );

        // Paziņo lietotājam par noraidījumu.
        const message = `Jūsu pieteikums grupai '${application.groupName || 'Nezināma Grupa'}' tika noraidīts.`;
        await createNotification(db, application.userId, 'GROUP_APPLICATION_REJECTED', message, `/grupas`, application.groupId, 'group');

        res.json({ msg: 'Pieteikums veiksmīgi noraidīts.' });
    } catch (err) {
        console.error('Kļūda, noraidot grupas pieteikumu:', err);
        res.status(500).json({ msg: 'Servera kļūda, noraidot pieteikumu.' });
    }
});


// ==== MARŠRUTI TIEŠAI DALĪBNIEKU PĀRVALDĪBAI ====

// @route   POST api/groups/:groupId/members
// @desc    Administrators tieši pievieno lietotāju grupai.
// @access  Privāts (Administrators)
router.post('/:groupId/members', [authMiddleware, adminMiddleware], async (req, res) => {
    const { groupId } = req.params;
    const { userId } = req.body; // Lietotāja ID, kuru pievienot.

    if (!ObjectId.isValid(groupId) || !ObjectId.isValid(userId)) {
        return res.status(400).json({ msg: 'Nederīgs grupas vai lietotāja ID.' });
    }

    const groupObjectId = new ObjectId(groupId);
    const userObjectId = new ObjectId(userId);

    try {
        const db = getDB();
        const groupsCollection = db.collection('groups');
        const usersCollection = db.collection('users');

        // Pārbauda, vai grupa un lietotājs eksistē.
        const group = await groupsCollection.findOne({ _id: groupObjectId });
        if (!group) {
            return res.status(404).json({ msg: 'Grupa nav atrasta.' });
        }
        const user = await usersCollection.findOne({ _id: userObjectId });
        if (!user) {
            return res.status(404).json({ msg: 'Lietotājs nav atrasts.' });
        }

        // Pievieno lietotāju grupas `members` sarakstam un grupu lietotāja `enrolledCustomGroups` sarakstam.
        const groupUpdateResult = await groupsCollection.updateOne(
            { _id: groupObjectId },
            { $addToSet: { members: userObjectId } }
        );
        const userUpdateResult = await usersCollection.updateOne(
            { _id: userObjectId },
            { $addToSet: { enrolledCustomGroups: groupObjectId } }
        );

        // Ja notika izmaiņas kādā no sarakstiem.
        if (groupUpdateResult.modifiedCount > 0 || userUpdateResult.modifiedCount > 0) {
            // Ja lietotājam bija 'pending' pieteikums šai grupai, atjaunina to uz 'approved'.
            await db.collection('groupApplications').updateOne(
                { userId: userObjectId, groupId: groupObjectId, status: 'pending' },
                { $set: { status: 'approved', processedAt: new Date(), processedBy: new ObjectId(req.user.id), reason: 'Manuāli pievienots administrators' } }
            );

            // Paziņo lietotājam.
            const message = `Jūs tikāt pievienots grupai '${group.name}' no administratora puses.`;
            await createNotification(db, userObjectId, 'ADMIN_ADDED_TO_GROUP', message, `/grupas`, groupObjectId, 'group');

            res.json({ msg: `Lietotājs ${user.firstName} ${user.lastName} veiksmīgi pievienots grupai '${group.name}'.` });
        } else {
            // Ja izmaiņas nenotika (lietotājs jau bija grupā).
            res.json({ msg: `Lietotājs ${user.firstName} ${user.lastName} jau bija grupā '${group.name}' vai izmaiņas netika veiktas.` });
        }

    } catch (error) {
        console.error('Kļūda, pievienojot dalībnieku grupai:', error);
        res.status(500).json({ msg: 'Servera kļūda, pievienojot dalībnieku grupai.' });
    }
});

// @route   DELETE api/groups/:groupId/members/:userId
// @desc    Administrators tieši noņem lietotāju no grupas.
// @access  Privāts (Administrators)
router.delete('/:groupId/members/:userId', [authMiddleware, adminMiddleware], async (req, res) => {
    const { groupId, userId } = req.params;

    if (!ObjectId.isValid(groupId) || !ObjectId.isValid(userId)) {
        return res.status(400).json({ msg: 'Nederīgs grupas vai lietotāja ID.' });
    }

    const groupObjectId = new ObjectId(groupId);
    const userObjectId = new ObjectId(userId);

    try {
        const db = getDB();
        const groupsCollection = db.collection('groups');
        const usersCollection = db.collection('users');

        const group = await groupsCollection.findOne({ _id: groupObjectId });
        if (!group) {
            return res.status(404).json({ msg: 'Grupa nav atrasta.' });
        }
        const user = await usersCollection.findOne({ _id: userObjectId });
        if (!user) {
            return res.status(404).json({ msg: 'Lietotājs nav atrasts.' });
        }

        // Noņem lietotāju no grupas un grupu no lietotāja.
        const groupUpdateResult = await groupsCollection.updateOne(
            { _id: groupObjectId },
            { $pull: { members: userObjectId } }
        );
        const userUpdateResult = await usersCollection.updateOne(
            { _id: userObjectId },
            { $pull: { enrolledCustomGroups: groupObjectId } }
        );

        if (groupUpdateResult.modifiedCount > 0 || userUpdateResult.modifiedCount > 0) {
            // Paziņo lietotājam.
            const message = `Jūs tikāt noņemts no grupas '${group.name}' no administratora puses.`;
            await createNotification(db, userObjectId, 'ADMIN_REMOVED_FROM_GROUP', message, `/grupas`, groupObjectId, 'group');

            res.json({ msg: `Lietotājs ${user.firstName} ${user.lastName} veiksmīgi noņemts no grupas '${group.name}'.` });
        } else {
            res.json({ msg: `Lietotājs ${user.firstName} ${user.lastName} nebija grupā '${group.name}' vai izmaiņas netika veiktas.` });
        }

    } catch (error) {
        console.error('Kļūda, noņemot dalībnieku no grupas:', error);
        res.status(500).json({ msg: 'Servera kļūda, noņemot dalībnieku no grupas.' });
    }
});


module.exports = router;