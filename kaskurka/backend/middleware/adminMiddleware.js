const jwt = require('jsonwebtoken'); // Though token is already verified by authMiddleware

module.exports = function(req, res, next) {
  // Assumes authMiddleware has already run and populated req.user
  if (req.user && req.user.role === 'admin') {
    next(); // User is admin, proceed
  } else {
    res.status(403).json({ msg: 'Piekļuve liegta. Nepieciešamas administratora tiesības.' }); // Forbidden
  }
};