const jwt = require('jsonwebtoken');
const path = require('path');
// Ielādē vides mainīgos no .env faila, kas atrodas projekta saknes direktorijā.
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Starpprogrammatūra (middleware), kas pārbauda lietotāja autentifikācijas pilnvaru (token).
module.exports = function (req, res, next) {
  // Iegūst 'Authorization' galveni no pieprasījuma.
  const authHeader = req.header('Authorization');

  // Ja 'Authorization' galvene nav atrasta, lietotājs nav autorizējies.
  if (!authHeader) {
    return res.status(401).json({ msg: 'Nav autorizācijas pilnvaras, piekļuve liegta.' });
  }

  try {
    // Pārbauda, vai pilnvaras formāts ir "Bearer <token>".
    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
      return res.status(401).json({ msg: 'Pilnvaras formāts nav pareizs, piekļuve liegta.' });
    }
    const token = tokenParts[1]; // Iegūst pašu pilnvaru.

    // Pārbauda un dekodē pilnvaru, izmantojot slepeno atslēgu.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Pievieno dekodētos lietotāja datus pieprasījuma objektam (req.user).
    // Šie dati ietvers: { id, email, role, firstName, studyStartYear, group, enrolledCustomGroupIds }
    req.user = decoded.user;

    // Piezīme: enrolledCustomGroupIds konvertācija uz ObjectId šeit nav obligāta,
    // jo maršruti paši var parūpēties par virkņu pārvēršanu ObjectId, ja nepieciešams datubāzes vaicājumiem.
    // Pašlaik ObjectId konvertācija tiek veikta maršrutos.
    // if (req.user.enrolledCustomGroupIds && Array.isArray(req.user.enrolledCustomGroupIds)) {
    //   req.user.enrolledCustomGroupIds = req.user.enrolledCustomGroupIds.map(idStr => new ObjectId(idStr));
    // }

    next(); // Ja pilnvara ir derīga, turpina uz nākamo funkciju (maršruta apstrādātāju).
  } catch (err) {
    console.error('Pilnvaras pārbaudes kļūda:', err.message);
    res.status(401).json({ msg: 'Pilnvara nav derīga.' }); // Ja pilnvara nav derīga vai notikusi cita kļūda.
  }
};