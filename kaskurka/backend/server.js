const express = require('express');
const cors = require('cors');
const path = require('path');
// Ielādē vides mainīgos no .env faila, kas atrodas projekta saknes mapē.
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { connectDB } = require('./config/db'); // Funkcija savienojuma izveidei ar datubāzi.

// Importē maršrutu moduļus.
const authRoutes = require('./routes/authRoutes');
const homeworkRoutes = require('./routes/homeworkRoutes');
const testRoutes = require('./routes/testRoutes');
const progressRoutes = require('./routes/progressRoutes');
const commentRoutes = require('./routes/commentRoutes');
const groupRoutes = require('./routes/groupRoutes');
const userRoutes = require('./routes/userRoutes');
const notificationRoutes = require('./routes/notificationRoutes'); // Pievienots paziņojumu maršruts.

const app = express(); // Izveido Express lietotnes instanci.

// Izveido savienojumu ar datubāzi.
connectDB();

// Starpprogrammatūras (Middleware) konfigurācija.
app.use(cors()); // Atļauj Cross-Origin Resource Sharing (CORS).
app.use(express.json()); // Atļauj apstrādāt JSON pieprasījumus.
app.use(express.urlencoded({ extended: true })); // Atļauj apstrādāt URL kodētus pieprasījumus.

// Definē maršrutus.
app.get('/', (req, res) => res.send('KasKurKa API darbojas')); // Vienkāršs testa maršruts.
app.use('/api/auth', authRoutes); // Autentifikācijas maršruti.
app.use('/api/homework', homeworkRoutes); // Mājasdarbu maršruti.
app.use('/api/tests', testRoutes); // Pārbaudes darbu maršruti.
app.use('/api/progress', progressRoutes); // Progresa maršruti.
app.use('/api/comments', commentRoutes); // Komentāru maršruti.
app.use('/api/groups', groupRoutes); // Grupu maršruti.
app.use('/api/users', userRoutes); // Lietotāju pārvaldības maršruti.
app.use('/api/notifications', notificationRoutes); // Paziņojumu maršruti.


const PORT = process.env.PORT || 5000; // Nosaka portu, uz kura serveris klausīsies.

// Palaiž serveri.
app.listen(PORT, () => console.log(`Backend serveris palaists uz porta ${PORT}`));