// kaskurka/backend/routes/authRoutes.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB } = require('../config/db');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const router = express.Router();

// @route   POST api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    password,
    studyStartYear,
    group,
    subgroup,
  } = req.body;

  // Basic validation (Matches 2.2.1 requirements from Kvalifikacijas_darbs.txt)
  if (!firstName || !lastName || !email || !password || !studyStartYear || !group) {
    return res.status(400).json({ msg: 'Lūdzu, aizpildiet visus obligātos laukus.' });
  }

  // Password complexity check from spec 2.2.1
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      msg: "Parolei jābūt vismaz 8 rakstzīmes garai un jāsatur vismaz viens lielais burts, viens mazais burts un viens cipars."
    });
  }


  try {
    const db = getDB();
    const usersCollection = db.collection('users');

    // Check if user already exists
    let userCheck = await usersCollection.findOne({ email: email.toLowerCase() });
    if (userCheck) {
      return res.status(400).json({ msg: 'Lietotājs ar šādu e-pastu jau eksistē.' });
    }

    const newUser = {
      firstName,
      lastName,
      email: email.toLowerCase(),
      password, // Will be hashed
      studyStartYear: parseInt(studyStartYear, 10),
      group,
      subgroup: subgroup || '',
      createdAt: new Date(),
      role: 'student', // Default role as per spec 2.1.1
    };

    const salt = await bcrypt.genSalt(10);
    newUser.password = await bcrypt.hash(password, salt);

    const result = await usersCollection.insertOne(newUser);
    
    const registeredUser = {
        _id: result.insertedId, 
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        studyStartYear: newUser.studyStartYear,
        group: newUser.group,
        subgroup: newUser.subgroup,
        role: newUser.role,
        createdAt: newUser.createdAt
    };

    res.status(201).json({ msg: 'Reģistrācija veiksmīga!', user: registeredUser });

  } catch (err) {
    console.error('Registration error:', err.message);
    res.status(500).send('Servera kļūda');
  }
});


// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ msg: 'Lūdzu, ievadiet e-pastu un paroli.' });
  }

  try {
    const db = getDB();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ msg: 'Nepareizs e-pasts vai parole.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Nepareizs e-pasts vai parole.' });
    }

    const payload = {
      user: {
        id: user._id, 
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        studyStartYear: user.studyStartYear, // Added for homework/test context
        group: user.group,                 // Added
        subgroup: user.subgroup            // Added
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '5h' }, 
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: { 
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            studyStartYear: user.studyStartYear,
            group: user.group,
            subgroup: user.subgroup,
            role: user.role,
            createdAt: user.createdAt
          }
        });
      }
    );
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).send('Servera kļūda');
  }
});

module.exports = router;