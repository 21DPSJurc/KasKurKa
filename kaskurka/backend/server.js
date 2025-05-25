const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { connectDB } = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const homeworkRoutes = require('./routes/homeworkRoutes');
const testRoutes = require('./routes/testRoutes');
const progressRoutes = require('./routes/progressRoutes');
const commentRoutes = require('./routes/commentRoutes');
const groupRoutes = require('./routes/groupRoutes');
const userRoutes = require('./routes/userRoutes');
const notificationRoutes = require('./routes/notificationRoutes'); // Added

const app = express();

// Connect to Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Define Routes
app.get('/', (req, res) => res.send('KasKurKa API Running'));
app.use('/api/auth', authRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes); // Added


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Backend server started on port ${PORT}`));