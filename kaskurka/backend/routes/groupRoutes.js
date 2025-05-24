// kaskurka/backend/routes/groupRoutes.js
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
      members: [], // Stores user ObjectIds who are direct members
      // pendingApplications are handled by 'groupApplications' collection
    };

    const result = await groupsCollection.insertOne(newGroup);
    const createdGroup = await groupsCollection.findOne({_id: result.insertedId});
    res.status(201).json({ msg: 'Grupa veiksmīgi izveidota!', group: createdGroup });
  } catch (err) {
    console.error('Error creating group:', err);
    res.status(500).json({ msg: 'Servera kļūda, veidojot grupu.' });
  }
});

// @route   GET api/groups
// @desc    Get all available groups
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

// @route   POST api/groups/:groupId/apply
// @desc    Apply to join a group
// @access  Private (Students)
router.post('/:groupId/apply', authMiddleware, async (req, res) => {
  const groupId = req.params.groupId;
  const userId = new ObjectId(req.user.id);
  const userFirstName = req.user.firstName; // From JWT
  const userEmail = req.user.email;       // From JWT

  if (!ObjectId.isValid(groupId)) {
    return res.status(400).json({ msg: 'Nederīgs grupas ID.' });
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
      status: 'pending', 
      appliedAt: new Date(),
      // For easier lookup by admin, we can add groupName here
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
        // We also want group name for display in user's "My Applications" list if they applied to many
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
            { $unwind: { path: "$groupInfo", preserveNullAndEmptyArrays: true } }, // preserve if group was somehow deleted
            {
                $project: {
                    _id: 1,
                    groupId: 1,
                    groupName: '$groupInfo.name', // Get group name
                    status: 1,
                    appliedAt: 1,
                    userFirstName: 1, // Could be useful later if admin also sees their applications
                    userEmail: 1
                }
            },
            { $sort: { appliedAt: -1 } }
        ]).toArray();
        
        // For /my applications, returning full app objects is better than just map
        res.json(applications);
    } catch (err) {
        console.error('Error fetching user applications:', err);
        res.status(500).json({ msg: 'Servera kļūda, ielādējot pieteikumus.' });
    }
});

// --- Admin Routes for Group Application Management ---

// @route   GET api/groups/applications
// @desc    Get all group applications (for Admin, can filter by status)
// @access  Private (Admin)
router.get('/applications', [authMiddleware, adminMiddleware], async (req, res) => {
    const { status, groupId } = req.query; // e.g., ?status=pending or ?groupId=xyz
    try {
        const db = getDB();
        const groupApplicationsCollection = db.collection('groupApplications');
        
        const query = {};
        if (status) query.status = status;
        if (groupId && ObjectId.isValid(groupId)) query.groupId = new ObjectId(groupId);

        // Fetch applications and join with group details for group name
        const applications = await groupApplicationsCollection.aggregate([
            { $match: query },
            {
                $lookup: {
                    from: 'groups', // The collection to join
                    localField: 'groupId', // Field from the input documents (groupApplications)
                    foreignField: '_id', // Field from the documents of the "from" collection (groups)
                    as: 'groupDetails' // Output array field
                }
            },
            {
                $unwind: { // Deconstructs the array field from the $lookup
                    path: "$groupDetails",
                    preserveNullAndEmptyArrays: true // Keep application even if group is somehow deleted
                }
            },
            {
                $project: { // Select/reshape the fields
                    _id: 1, // application ID
                    groupId: 1,
                    groupName: '$groupDetails.name', // Get the group name
                    userId: 1,
                    userFirstName: 1,
                    userEmail: 1,
                    status: 1,
                    appliedAt: 1
                }
            },
            { $sort: { appliedAt: -1 } } // Sort by newest first
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

        // 1. Update application status
        const updateAppStatus = await groupApplicationsCollection.updateOne(
            { _id: appObjectId },
            { $set: { status: 'approved', processedAt: new Date(), processedBy: new ObjectId(req.user.id) } }
        );
        if (updateAppStatus.modifiedCount === 0) {
             return res.status(500).json({ msg: 'Neizdevās atjaunināt pieteikuma statusu.' });
        }

        // 2. Add user to group members
        const updateUserInGroup = await groupsCollection.updateOne(
            { _id: application.groupId },
            { $addToSet: { members: application.userId } } // $addToSet prevents duplicates
        );
        // Not critical if updateUserInGroup.modifiedCount is 0 (if user was already manually added)

        // 3. Add group to user's enrolledCustomGroups
        const updateUserDoc = await usersCollection.updateOne(
            { _id: application.userId },
            { $addToSet: { enrolledCustomGroups: application.groupId } }
        );
        // Not critical if updateUserDoc.modifiedCount is 0

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

        const updateResult = await groupApplicationsCollection.updateOne(
            { _id: appObjectId },
            { $set: { status: 'rejected', processedAt: new Date(), processedBy: new ObjectId(req.user.id) } }
        );

        if (updateResult.modifiedCount === 0) {
             return res.status(500).json({ msg: 'Neizdevās atjaunināt pieteikuma statusu uz noraidītu.' });
        }

        res.json({ msg: 'Pieteikums veiksmīgi noraidīts.' });

    } catch (err) {
        console.error('Error rejecting group application:', err);
        res.status(500).json({ msg: 'Servera kļūda, noraidot pieteikumu.' });
    }
});


module.exports = router;