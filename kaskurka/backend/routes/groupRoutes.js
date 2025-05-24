const express = require('express');
const router = express.Router();
const { getDB } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { ObjectId } = require('mongodb');

// @route   POST api/groups
// @desc    Create a new group (Admin only)
// @access  Private (Admin)
router.post('/', [authMiddleware, adminMiddleware], async (req, res) => {
    const { name, description, studyYear } = req.body;

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
        const existingGroup = await groupsCollection.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' } });
        if (existingGroup) {
            return res.status(400).json({ msg: 'Grupa ar šādu nosaukumu jau eksistē.' });
        }

        const newGroup = {
            name: name.trim(),
            description: description ? description.trim() : '',
            studyYear: studyYear ? studyYear.trim() : '',
            adminCreatorId: new ObjectId(req.user.id),
            createdAt: new Date(),
            updatedAt: new Date(),
            members: [], // Initialize as empty array of user ObjectIds
        };

        const result = await groupsCollection.insertOne(newGroup);
        const createdGroup = await groupsCollection.findOne({ _id: result.insertedId });
        res.status(201).json({ msg: 'Grupa veiksmīgi izveidota!', group: createdGroup });
    } catch (err) {
        console.error('Error creating group:', err);
        res.status(500).json({ msg: 'Servera kļūda, veidojot grupu.' });
    }
});

// @route   GET api/groups
// @desc    Get all available groups (For all authenticated users to see and apply)
// @access  Private (All authenticated users)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const db = getDB();
        const groupsCollection = db.collection('groups');
        const groups = await groupsCollection.find({}).sort({ name: 1 }).toArray();
        res.json(groups);
    } catch (err) {
        console.error('Error fetching groups:', err);
        res.status(500).json({ msg: 'Servera kļūda, ielādējot grupas.' });
    }
});

// @route   GET api/groups/details/:groupId
// @desc    Get details for a specific group (Admin only, for editing purposes)
// @access  Private (Admin)
router.get('/details/:groupId', [authMiddleware, adminMiddleware], async (req, res) => {
    const { groupId } = req.params;
    if (!ObjectId.isValid(groupId)) {
        return res.status(400).json({ msg: 'Nederīgs grupas ID.' });
    }
    try {
        const db = getDB();
        const groupsCollection = db.collection('groups');
        const group = await groupsCollection.findOne({ _id: new ObjectId(groupId) });
        if (!group) {
            return res.status(404).json({ msg: 'Grupa nav atrasta.' });
        }
        res.json(group);
    } catch (error) {
        console.error('Error fetching group details for admin:', error);
        res.status(500).json({ msg: 'Servera kļūda, ielādējot grupas datus.' });
    }
});

// @route   PUT api/groups/:groupId
// @desc    Update a group (Admin only)
// @access  Private (Admin)
router.put('/:groupId', [authMiddleware, adminMiddleware], async (req, res) => {
    const { groupId } = req.params;
    const { name, description, studyYear } = req.body;

    if (!ObjectId.isValid(groupId)) {
        return res.status(400).json({ msg: 'Nederīgs grupas ID.' });
    }

    // Validation for updated fields
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

        const existingGroup = await groupsCollection.findOne({ _id: groupObjectId });
        if (!existingGroup) {
            return res.status(404).json({ msg: 'Grupa nav atrasta.' });
        }

        const conflictingGroup = await groupsCollection.findOne({
            name: { $regex: `^${name.trim()}$`, $options: 'i' },
            _id: { $ne: groupObjectId }
        });
        if (conflictingGroup) {
            return res.status(400).json({ msg: 'Grupa ar šādu nosaukumu jau eksistē.' });
        }

        const updateFields = {
            name: name.trim(),
            description: description ? description.trim() : existingGroup.description,
            studyYear: studyYear ? studyYear.trim() : existingGroup.studyYear,
            updatedAt: new Date(),
        };

        const result = await groupsCollection.updateOne(
            { _id: groupObjectId },
            { $set: updateFields }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ msg: 'Grupa netika atrasta atjaunināšanai.' });
        }

        const updatedGroup = await groupsCollection.findOne({ _id: groupObjectId });
        res.json({ msg: 'Grupa veiksmīgi atjaunināta!', group: updatedGroup });

    } catch (error) {
        console.error('Error updating group:', error);
        res.status(500).json({ msg: 'Servera kļūda, atjauninot grupu.' });
    }
});

// @route   DELETE api/groups/:groupId
// @desc    Delete a group (Admin only)
// @access  Private (Admin)
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
        const groupObjectId = new ObjectId(groupId);

        const groupToDelete = await groupsCollection.findOne({ _id: groupObjectId });
        if (!groupToDelete) {
            return res.status(404).json({ msg: 'Grupa nav atrasta.' });
        }

        await groupsCollection.deleteOne({ _id: groupObjectId });
        await groupApplicationsCollection.deleteMany({ groupId: groupObjectId });
        await usersCollection.updateMany(
            { enrolledCustomGroups: groupObjectId },
            { $pull: { enrolledCustomGroups: groupObjectId } }
        );

        res.json({ msg: 'Grupa un saistītie pieteikumi veiksmīgi dzēsti. Grupa noņemta no lietotāju profiliem.' });

    } catch (error) {
        console.error('Error deleting group:', error);
        res.status(500).json({ msg: 'Servera kļūda, dzēšot grupu.' });
    }
});


// @route   POST api/groups/:groupId/apply
// @desc    Apply to join a group
// @access  Private (Students)
router.post('/:groupId/apply', authMiddleware, async (req, res) => {
    const groupId = req.params.groupId;
    const userId = new ObjectId(req.user.id);
    const userFirstName = req.user.firstName;
    const userEmail = req.user.email;
    const { message } = req.body;

    if (!ObjectId.isValid(groupId)) {
        return res.status(400).json({ msg: 'Nederīgs grupas ID.' });
    }
    if (message && message.length > 500) {
        return res.status(400).json({ msg: 'Pieteikuma ziņa nedrīkst pārsniegt 500 rakstzīmes.' });
    }

    try {
        const db = getDB();
        const groupsCollection = db.collection('groups');
        const groupApplicationsCollection = db.collection('groupApplications');
        const usersCollection = db.collection('users');
        const groupObjectId = new ObjectId(groupId);

        const group = await groupsCollection.findOne({ _id: groupObjectId });
        if (!group) {
            return res.status(404).json({ msg: 'Grupa nav atrasta.' });
        }

        const userDoc = await usersCollection.findOne({ _id: userId });
        if (userDoc && userDoc.enrolledCustomGroups && userDoc.enrolledCustomGroups.some(gId => gId.equals(groupObjectId))) {
            return res.status(400).json({ msg: 'Jūs jau esat šīs grupas dalībnieks.' });
        }
        if (group.members && group.members.some(memberId => memberId.equals(userId))) {
            return res.status(400).json({ msg: 'Jūs jau esat šīs grupas dalībnieks (pārbaudīts grupas sarakstā).' });
        }


        const existingApplication = await groupApplicationsCollection.findOne({
            groupId: groupObjectId,
            userId: userId,
            status: { $in: ['pending', 'approved'] }
        });

        if (existingApplication) {
            if (existingApplication.status === 'pending') {
                return res.status(400).json({ msg: 'Jūsu pieteikums šai grupai jau ir reģistrēts un gaida apstiprinājumu.' });
            } else if (existingApplication.status === 'approved') {
                return res.status(400).json({ msg: 'Jūs jau esat apstiprināts šai grupai.' });
            }
        }

        const newApplication = {
            groupId: groupObjectId,
            userId: userId,
            userFirstName: userFirstName,
            userEmail: userEmail,
            message: message ? message.trim() : '',
            status: 'pending',
            appliedAt: new Date(),
            groupName: group.name
        };
        await groupApplicationsCollection.insertOne(newApplication);
        res.status(201).json({ msg: 'Pieteikums grupai veiksmīgi nosūtīts!' });
    } catch (err) {
        console.error('Error applying to group:', err);
        res.status(500).json({ msg: 'Servera kļūda, piesakoties grupai.' });
    }
});

// @route   GET api/groups/applications/my
// @desc    Get all applications for the currently logged-in user
// @access  Private
router.get('/applications/my', authMiddleware, async (req, res) => {
    const userId = new ObjectId(req.user.id);
    try {
        const db = getDB();
        const groupApplicationsCollection = db.collection('groupApplications');
        const applications = await groupApplicationsCollection.aggregate([
            { $match: { userId: userId } },
            {
                $lookup: {
                    from: 'groups',
                    localField: 'groupId',
                    foreignField: '_id',
                    as: 'groupInfo'
                }
            },
            { $unwind: { path: "$groupInfo", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1, groupId: 1, groupName: '$groupInfo.name', status: 1,
                    appliedAt: 1, message: 1, userFirstName: 1, userEmail: 1
                }
            },
            { $sort: { appliedAt: -1 } }
        ]).toArray();
        res.json(applications);
    } catch (err) {
        console.error('Error fetching user applications:', err);
        res.status(500).json({ msg: 'Servera kļūda, ielādējot pieteikumus.' });
    }
});

// @route   GET api/groups/applications
// @desc    Get all group applications (for Admin, can filter by status)
// @access  Private (Admin)
router.get('/applications', [authMiddleware, adminMiddleware], async (req, res) => {
    const { status, groupId } = req.query;
    try {
        const db = getDB();
        const groupApplicationsCollection = db.collection('groupApplications');
        const query = {};
        if (status) query.status = status;
        if (groupId && ObjectId.isValid(groupId)) query.groupId = new ObjectId(groupId);

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
                    groupName: { $ifNull: ['$groupDetails.name', '$groupName'] },
                    userId: 1, userFirstName: 1, userEmail: 1, message: 1,
                    status: 1, appliedAt: 1
                }
            },
            { $sort: { appliedAt: -1 } }
        ]).toArray();
        res.json(applications);
    } catch (err) {
        console.error('Error fetching group applications for admin:', err);
        res.status(500).json({ msg: 'Servera kļūda, ielādējot grupu pieteikumus.' });
    }
});

// @route   PUT api/groups/applications/:applicationId/approve
// @desc    Approve a group application (Admin only)
// @access  Private (Admin)
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

        const application = await groupApplicationsCollection.findOne({ _id: appObjectId });
        if (!application) {
            return res.status(404).json({ msg: 'Pieteikums nav atrasts.' });
        }
        if (application.status !== 'pending') {
            return res.status(400).json({ msg: `Pieteikums jau ir ticis '${application.status}'.` });
        }

        const groupExists = await groupsCollection.findOne({ _id: application.groupId });
        if (!groupExists) {
            await groupApplicationsCollection.updateOne(
                { _id: appObjectId },
                { $set: { status: 'rejected', processedAt: new Date(), processedBy: new ObjectId(req.user.id), reason: 'Grupa vairs neeksistē' } }
            );
            return res.status(404).json({ msg: 'Nevar apstiprināt pieteikumu: Grupa vairs neeksistē. Pieteikums automātiski noraidīts.' });
        }

        await groupApplicationsCollection.updateOne(
            { _id: appObjectId },
            { $set: { status: 'approved', processedAt: new Date(), processedBy: new ObjectId(req.user.id) } }
        );
        await groupsCollection.updateOne(
            { _id: application.groupId },
            { $addToSet: { members: application.userId } }
        );
        await usersCollection.updateOne(
            { _id: application.userId },
            { $addToSet: { enrolledCustomGroups: application.groupId } }
        );
        res.json({ msg: 'Pieteikums veiksmīgi apstiprināts. Lietotājs pievienots grupai.' });
    } catch (err) {
        console.error('Error approving group application:', err);
        res.status(500).json({ msg: 'Servera kļūda, apstiprinot pieteikumu.' });
    }
});

// @route   PUT api/groups/applications/:applicationId/reject
// @desc    Reject a group application (Admin only)
// @access  Private (Admin)
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
        await groupApplicationsCollection.updateOne(
            { _id: appObjectId },
            { $set: { status: 'rejected', processedAt: new Date(), processedBy: new ObjectId(req.user.id) } }
        );
        res.json({ msg: 'Pieteikums veiksmīgi noraidīts.' });
    } catch (err) {
        console.error('Error rejecting group application:', err);
        res.status(500).json({ msg: 'Servera kļūda, noraidot pieteikumu.' });
    }
});

// ==== NEW ROUTES FOR DIRECT MEMBER MANAGEMENT ====

// @route   POST api/groups/:groupId/members
// @desc    Admin directly adds a user to a group
// @access  Private (Admin)
router.post('/:groupId/members', [authMiddleware, adminMiddleware], async (req, res) => {
    const { groupId } = req.params;
    const { userId } = req.body; // User ID to add

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
        // Optional: Check if user is already a member (though $addToSet handles duplicates)
        // if (group.members && group.members.some(memberId => memberId.equals(userObjectId))) {
        //     return res.status(400).json({ msg: 'Lietotājs jau ir šīs grupas dalībnieks.' });
        // }

        // Add user to group's members list
        const groupUpdateResult = await groupsCollection.updateOne(
            { _id: groupObjectId },
            { $addToSet: { members: userObjectId } }
        );

        // Add group to user's enrolledCustomGroups list
        const userUpdateResult = await usersCollection.updateOne(
            { _id: userObjectId },
            { $addToSet: { enrolledCustomGroups: groupObjectId } }
        );

        if (groupUpdateResult.modifiedCount > 0 || userUpdateResult.modifiedCount > 0) {
            // Also mark any 'pending' application for this user to this group as 'approved'
            await db.collection('groupApplications').updateOne(
                { userId: userObjectId, groupId: groupObjectId, status: 'pending' },
                { $set: { status: 'approved', processedAt: new Date(), processedBy: new ObjectId(req.user.id), reason: 'Manuāli pievienots administrators' } }
            );
            res.json({ msg: `Lietotājs ${user.firstName} ${user.lastName} veiksmīgi pievienots grupai '${group.name}'.` });
        } else {
            res.json({ msg: `Lietotājs ${user.firstName} ${user.lastName} jau bija grupā '${group.name}' vai izmaiņas netika veiktas.` });
        }

    } catch (error) {
        console.error('Error adding member to group:', error);
        res.status(500).json({ msg: 'Servera kļūda, pievienojot dalībnieku grupai.' });
    }
});

// @route   DELETE api/groups/:groupId/members/:userId
// @desc    Admin directly removes a user from a group
// @access  Private (Admin)
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

        // Remove user from group's members list
        const groupUpdateResult = await groupsCollection.updateOne(
            { _id: groupObjectId },
            { $pull: { members: userObjectId } }
        );

        // Remove group from user's enrolledCustomGroups list
        const userUpdateResult = await usersCollection.updateOne(
            { _id: userObjectId },
            { $pull: { enrolledCustomGroups: groupObjectId } }
        );

        // If user is removed, their 'approved' application could be marked as 'revoked' or 'rejected'.
        // For now, we'll keep it simple: their application status won't change automatically.
        // They would need to re-apply if they wanted to join again through the application system.
        // Or, an admin could change their application status manually if a UI for that existed.

        if (groupUpdateResult.modifiedCount > 0 || userUpdateResult.modifiedCount > 0) {
            res.json({ msg: `Lietotājs ${user.firstName} ${user.lastName} veiksmīgi noņemts no grupas '${group.name}'.` });
        } else {
            res.json({ msg: `Lietotājs ${user.firstName} ${user.lastName} nebija grupā '${group.name}' vai izmaiņas netika veiktas.` });
        }

    } catch (error) {
        console.error('Error removing member from group:', error);
        res.status(500).json({ msg: 'Servera kļūda, noņemot dalībnieku no grupas.' });
    }
});


module.exports = router;