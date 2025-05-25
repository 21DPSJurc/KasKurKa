const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb'); // Pievieno ObjectId MongoDB identifikatoriem.
const path = require('path');
// Ielādē vides mainīgos no .env faila.
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const authMiddleware = require('../middleware/authMiddleware'); // Autentifikācijas starpprogrammatūra jaunajam /me/refresh maršrutam.

const router = express.Router(); // Izveido jaunu maršrutētāja instanci.

// @route   POST api/auth/register
// @desc    Reģistrē jaunu lietotāju.
// @access  Publisks
router.post('/register', async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    password,
    studyStartYear,
    group,
  } = req.body; // Iegūst datus no pieprasījuma ķermeņa.

  // Pārbauda, vai visi obligātie lauki ir aizpildīti.
  if (!firstName || !lastName || !email || !password || !studyStartYear || !group) {
    return res.status(400).json({ msg: 'Lūdzu, aizpildiet visus obligātos laukus.' });
  }

  // Paroles sarežģītības pārbaude.
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      msg: "Parolei jābūt vismaz 8 rakstzīmes garai un jāsatur vismaz viens lielais burts, viens mazais burts un viens cipars."
    });
  }

  try {
    const db = getDB(); // Iegūst datubāzes instanci.
    const usersCollection = db.collection('users'); // Iegūst 'users' kolekciju.

    // Pārbauda, vai lietotājs ar šādu e-pastu jau eksistē.
    let userCheck = await usersCollection.findOne({ email: email.toLowerCase() });
    if (userCheck) {
      return res.status(400).json({ msg: 'Lietotājs ar šādu e-pastu jau eksistē.' });
    }

    // Izveido jauna lietotāja objektu.
    const newUser = {
      firstName,
      lastName,
      email: email.toLowerCase(), // E-pastu glabā mazajiem burtiem, lai nodrošinātu unikalitāti.
      password, // Parole tiks šifrēta tālāk.
      studyStartYear: parseInt(studyStartYear, 10), // Pārvērš studiju sākuma gadu par skaitli.
      group, // Reģistrācijas grupa.
      createdAt: new Date(), // Reģistrācijas datums.
      role: 'student', // Noklusējuma loma jaunam lietotājam.
      enrolledCustomGroups: [], // Inicializē pielāgoto grupu sarakstu kā tukšu masīvu.
    };

    // Šifrē paroli.
    const salt = await bcrypt.genSalt(10);
    newUser.password = await bcrypt.hash(password, salt);

    // Ievieto jauno lietotāju datubāzē.
    const result = await usersCollection.insertOne(newUser);

    // Sagatavo reģistrētā lietotāja datus atbildes nosūtīšanai (bez paroles).
    const registeredUser = {
      _id: result.insertedId,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      studyStartYear: newUser.studyStartYear,
      group: newUser.group,
      role: newUser.role,
      enrolledCustomGroups: newUser.enrolledCustomGroups,
      createdAt: newUser.createdAt
    };

    res.status(201).json({ msg: 'Reģistrācija veiksmīga!', user: registeredUser });

  } catch (err) {
    console.error('Reģistrācijas kļūda:', err.message);
    res.status(500).send('Servera kļūda');
  }
});


// @route   POST api/auth/login
// @desc    Autentificē lietotāju un saņem pilnvaru (token).
// @access  Publisks
router.post('/login', async (req, res) => {
  const { email, password } = req.body; // Iegūst e-pastu un paroli no pieprasījuma.

  // Pārbauda, vai e-pasts un parole ir ievadīti.
  if (!email || !password) {
    return res.status(400).json({ msg: 'Lūdzu, ievadiet e-pastu un paroli.' });
  }

  try {
    const db = getDB();
    const usersCollection = db.collection('users');

    // Atrod lietotāju pēc e-pasta.
    const user = await usersCollection.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ msg: 'Nepareizs e-pasts vai parole.' });
    }

    // Salīdzina ievadīto paroli ar datubāzē saglabāto šifrēto paroli.
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Nepareizs e-pasts vai parole.' });
    }

    // Sagatavo informāciju par lietotāja pielāgotajām grupām HTTP atbildei.
    let enrolledCustomGroupsDetails = [];
    if (user.enrolledCustomGroups && user.enrolledCustomGroups.length > 0) {
      // Pārvērš grupu ID virknes par ObjectId objektiem vaicājumam.
      const groupObjectIds = user.enrolledCustomGroups.map(id => new ObjectId(id));
      // Iegūst grupu nosaukumus un ID, lai tos varētu parādīt lietotāja saskarnē.
      enrolledCustomGroupsDetails = await db.collection('groups')
        .find({ _id: { $in: groupObjectIds } })
        .project({ name: 1, _id: 1 }) // Atlasa tikai ID un nosaukumu.
        .toArray();
    }

    // Sagatavo datus JWT pilnvarai.
    const payload = {
      user: {
        id: user._id.toString(), // Pārliecinās, ka ID ir virkne priekš JWT.
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        studyStartYear: user.studyStartYear,
        group: user.group, // Lietotāja reģistrācijas grupa.
        // Saglabā pielāgoto grupu ID kā virknes JWT pilnvarā.
        enrolledCustomGroupIds: user.enrolledCustomGroups ? user.enrolledCustomGroups.map(id => id.toString()) : [],
      },
    };

    // Paraksta JWT pilnvaru.
    jwt.sign(
      payload,
      process.env.JWT_SECRET, // Slepenā atslēga no .env faila.
      { expiresIn: '5h' }, // Pilnvaras derīguma termiņš.
      (err, token) => {
        if (err) throw err;
        // Nosūta pilnvaru un lietotāja datus klientam.
        res.json({
          token,
          user: {
            id: user._id.toString(),
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            studyStartYear: user.studyStartYear,
            group: user.group, // Reģistrācijas grupa.
            role: user.role,
            createdAt: user.createdAt,
            // Pielāgoto grupu ID (kā virknes) konsekvencei.
            enrolledCustomGroups: user.enrolledCustomGroups ? user.enrolledCustomGroups.map(id => id.toString()) : [],
            enrolledCustomGroupsDetails: enrolledCustomGroupsDetails, // Detalizēti objekti lietotāja saskarnei.
          }
        });
      }
    );
  } catch (err) {
    console.error('Pieslēgšanās kļūda:', err.message);
    res.status(500).send('Servera kļūda');
  }
});


// @route   GET api/auth/me/refresh
// @desc    Iegūst aktuālos pašreizējā lietotāja datus.
// @access  Privāts (nepieciešama autorizācija)
router.get('/me/refresh', authMiddleware, async (req, res) => {
  try {
    const db = getDB();
    const usersCollection = db.collection('users');
    const userId = new ObjectId(req.user.id); // Lietotāja ID no autentifikācijas pilnvaras.

    // Atrod lietotāju datubāzē pēc ID.
    const user = await usersCollection.findOne({ _id: userId });

    if (!user) {
      // Šis gadījums ideāli būtu jānoķer authMiddleware, ja lietotājs neeksistē.
      // Tomēr, kā papildu drošības pārbaude:
      return res.status(404).json({ msg: 'Lietotājs nav atrasts.' });
    }

    // Sagatavo informāciju par lietotāja pielāgotajām grupām HTTP atbildei.
    let enrolledCustomGroupsDetails = [];
    if (user.enrolledCustomGroups && user.enrolledCustomGroups.length > 0) {
      // Pārliecinās, ka grupu ID ir ObjectId objekti.
      const groupObjectIds = user.enrolledCustomGroups.map(id => new ObjectId(id.toString()));
      enrolledCustomGroupsDetails = await db.collection('groups')
        .find({ _id: { $in: groupObjectIds } })
        .project({ name: 1, _id: 1 }) // Atlasa tikai ID un nosaukumu.
        .toArray();
    }

    // Konstruē lietotāja objektu, kas tiks atgriezts (līdzīgi kā pieslēgšanās gadījumā).
    const refreshedUserObject = {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      studyStartYear: user.studyStartYear,
      group: user.group, // Reģistrācijas grupa.
      role: user.role,
      createdAt: user.createdAt,
      // Pārliecinās, ka pielāgoto grupu ID ir virknes.
      enrolledCustomGroups: user.enrolledCustomGroups ? user.enrolledCustomGroups.map(id => id.toString()) : [],
      enrolledCustomGroupsDetails: enrolledCustomGroupsDetails,
    };

    res.json(refreshedUserObject); // Nosūta atjaunotos lietotāja datus.

  } catch (err) {
    console.error('Kļūda, atjaunojot lietotāja datus:', err);
    res.status(500).send('Servera kļūda, mēģinot atjaunot lietotāja datus.');
  }
});

module.exports = router; // Eksportē maršrutētāju.