const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

module.exports = function (req, res, next) {
  const authHeader = req.header('Authorization');

  if (!authHeader) {
    return res.status(401).json({ msg: 'Nav autorizācijas pilnvaras, piekļuve liegta.' });
  }

  try {
    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
      return res.status(401).json({ msg: 'Pilnvaras formāts nav pareizs, piekļuve liegta.' });
    }
    const token = tokenParts[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user; // This will now include { id, email, role, firstName, studyStartYear, group, enrolledCustomGroupIds }

    // Convert enrolledCustomGroupIds back to ObjectId for easier backend use if needed, though string comparison often works.
    // For DB queries, ObjectIds are usually preferred.
    if (req.user.enrolledCustomGroupIds && Array.isArray(req.user.enrolledCustomGroupIds)) {
      // This is optional here, can also be done in routes. For now, routes will handle string to ObjectId conversion.
      // req.user.enrolledCustomGroupIds = req.user.enrolledCustomGroupIds.map(idStr => new ObjectId(idStr));
    }

    next();
  } catch (err) {
    console.error('Token verification error:', err.message);
    res.status(401).json({ msg: 'Pilnvara nav derīga.' });
  }
};