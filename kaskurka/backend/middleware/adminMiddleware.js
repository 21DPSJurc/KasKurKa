const jwt = require('jsonwebtoken'); // Lai gan pilnvara jau ir pārbaudīta ar authMiddleware.

// Starpprogrammatūra (middleware), kas pārbauda, vai lietotājam ir administratora tiesības.
module.exports = function (req, res, next) {
  // Pieņem, ka authMiddleware jau ir nostrādājis un pievienojis req.user objektu.
  if (req.user && req.user.role === 'admin') {
    next(); // Lietotājs ir administrators, turpina uz nākamo funkciju.
  } else {
    // Ja lietotājam nav administratora tiesību, atgriež 403 (Aizliegts) statusu.
    res.status(403).json({ msg: 'Piekļuve liegta. Nepieciešamas administratora tiesības.' });
  }
};