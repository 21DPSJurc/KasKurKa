// kaskurka/backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const path = require('path');
// Load .env from the project root (kaskurka/.env)
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

module.exports = function(req, res, next) {
  // Get token from header
  const authHeader = req.header('Authorization');

  // Check if not token
  if (!authHeader) {
    return res.status(401).json({ msg: 'Nav autorizācijas pilnvaras, piekļuve liegta.' }); // No token, authorization denied
  }

  try {
    // Token format: "Bearer <token>"
    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
        return res.status(401).json({ msg: 'Pilnvaras formāts nav pareizs, piekļuve liegta.' }); // Token format invalid
    }
    const token = tokenParts[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user; // Add user from payload to request object
    next();
  } catch (err) {
    console.error('Token verification error:', err.message);
    res.status(401).json({ msg: 'Pilnvara nav derīga.' }); // Token is not valid
  }
};