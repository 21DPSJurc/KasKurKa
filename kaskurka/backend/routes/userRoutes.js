// kaskurka/backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { getDB } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs'); // For potential password changes by admin (if allowed)

// @route   GET api/users
// @desc    Get all users (Admin only)
// @access  Private (Admin)
router.get('/', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const db = getDB();
        const usersCollection = db.collection('users');
        // Exclude password from the returned user objects
        const users = await usersCollection.find({}).project({ password: 0 }).sort({ lastName: 1, firstName: 1 }).toArray();
        res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ msg: 'Servera kļūda, ielādējot lietotājus.' });
    }
});

// @route   GET api/users/:userId
// @desc    Get a specific user by ID (Admin only)
// @access  Private (Admin)
router.get('/:userId', [authMiddleware, adminMiddleware], async (req, res) => {
    const { userId } = req.params;
    if (!ObjectId.isValid(userId)) {
        return res.status(400).json({ msg: 'Nederīgs lietotāja ID.' });
    }
    try {
        const db = getDB();
        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) }, { projection: { password: 0 } });

        if (!user) {
            return res.status(404).json({ msg: 'Lietotājs nav atrasts.' });
        }
        res.json(user);
    } catch (err) {
        console.error('Error fetching user by ID:', err);
        res.status(500).json({ msg: 'Servera kļūda, ielādējot lietotāja datus.' });
    }
});

// @route   PUT api/users/:userId
// @desc    Update a user's details (Admin only)
// @access  Private (Admin)
router.put('/:userId', [authMiddleware, adminMiddleware], async (req, res) => {
    const { userId } = req.params;
    const { firstName, lastName, email, role, studyStartYear, group, /*subgroup,*/ newPassword } = req.body; // subgroup removed

    if (!ObjectId.isValid(userId)) {
        return res.status(400).json({ msg: 'Nederīgs lietotāja ID.' });
    }

    // Basic validation
    if (!firstName || !lastName || !email || !role || !studyStartYear || !group) {
        return res.status(400).json({ msg: 'Lūdzu, aizpildiet visus obligātos laukus (Vārds, Uzvārds, E-pasts, Loma, Mācību s. gads, Grupa).' });
    }
    if (!['student', 'admin'].includes(role)) {
        return res.status(400).json({ msg: 'Nederīga loma. Atļautās lomas: student, admin.' });
    }
    // Password complexity check if newPassword is provided
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

        const userToUpdate = await usersCollection.findOne({ _id: userObjectId });
        if (!userToUpdate) {
            return res.status(404).json({ msg: 'Lietotājs nav atrasts.' });
        }

        // Check if new email conflicts with another existing user (excluding itself)
        const conflictingUser = await usersCollection.findOne({
            email: email.toLowerCase(),
            _id: { $ne: userObjectId }
        });
        if (conflictingUser) {
            return res.status(400).json({ msg: 'Lietotājs ar šādu e-pastu jau eksistē.' });
        }

        const updateFields = {
            firstName,
            lastName,
            email: email.toLowerCase(),
            role,
            studyStartYear: parseInt(studyStartYear, 10),
            group,
            // subgroup: subgroup || '', // subgroup removed
            updatedAt: new Date(),
        };

        // Ensure subgroup is removed if it exists
        if (Object.prototype.hasOwnProperty.call(userToUpdate, 'subgroup')) {
            updateFields.$unset = { subgroup: "" };
        }


        if (newPassword) {
            const salt = await bcrypt.genSalt(10);
            updateFields.password = await bcrypt.hash(newPassword, salt);
        }


        const result = await usersCollection.updateOne(
            { _id: userObjectId },
            { $set: updateFields }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ msg: 'Lietotājs netika atrasts atjaunināšanai.' });
        }

        const updatedUser = await usersCollection.findOne({ _id: userObjectId }, { projection: { password: 0 } }); // Fetch updated user without password
        res.json({ msg: 'Lietotāja dati veiksmīgi atjaunināti!', user: updatedUser });

    } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).json({ msg: 'Servera kļūda, atjauninot lietotāja datus.' });
    }
});

// @route   DELETE api/users/:userId
// @desc    Delete a user (Admin only)
// @access  Private (Admin)
router.delete('/:userId', [authMiddleware, adminMiddleware], async (req, res) => {
    const { userId } = req.params;

    if (!ObjectId.isValid(userId)) {
        return res.status(400).json({ msg: 'Nederīgs lietotāja ID.' });
    }
    const adminUserId = req.user.id; // ID of the admin performing the action

    if (userId === adminUserId) {
        return res.status(400).json({ msg: 'Administrators nevar dzēst pats sevi.' });
    }

    try {
        const db = getDB();
        const usersCollection = db.collection('users');
        const userObjectId = new ObjectId(userId);

        const userToDelete = await usersCollection.findOne({ _id: userObjectId });
        if (!userToDelete) {
            return res.status(404).json({ msg: 'Lietotājs nav atrasts.' });
        }

        // Potential cascading deletions or cleanups:
        // 1. Remove user from group.members arrays
        await db.collection('groups').updateMany(
            { members: userObjectId },
            { $pull: { members: userObjectId } }
        );
        // 2. Delete user's group applications
        await db.collection('groupApplications').deleteMany({ userId: userObjectId });
        // 3. Delete user's item progress
        await db.collection('userItemProgress').deleteMany({ userId: userObjectId });
        // 4. Handle user's comments (e.g., anonymize, mark as deleted user, or delete)
        // For now, let's just mark comments with a flag or change userName
        await db.collection('comments').updateMany(
            { userId: userObjectId },
            { $set: { userName: `${userToDelete.firstName} (Dzēsts Lietotājs)`, originalUserId: userToDelete._id, userId: null } } // Anonymize
        );
        // 5. Handle user's created homework/tests (e.g., assign to a generic admin, mark as orphaned, or delete)
        // For now, let's assume for now that content created by users remains, attributed to their name.
        // If stricter deletion is needed, that would be more complex.


        const deleteResult = await usersCollection.deleteOne({ _id: userObjectId });
        if (deleteResult.deletedCount === 0) {
            return res.status(404).json({ msg: 'Lietotāju neizdevās dzēst vai tas jau ir dzēsts.' });
        }

        res.json({ msg: `Lietotājs ${userToDelete.firstName} ${userToDelete.lastName} veiksmīgi dzēsts.` });

    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ msg: 'Servera kļūda, dzēšot lietotāju.' });
    }
});


module.exports = router;