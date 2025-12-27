const jwt = require('jsonwebtoken');
const User = require('../models/user');
const config = require('../config/config');

function authMiddleware(requiredRole) {
  return async function (req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.jwtSecret);

      // Try DB-backed lookup first, fallback to global.users if DB lookup fails
      let user = null;
      try {
        user = await User.findByPk(decoded.id);
      } catch (dbErr) {
        console.warn('DB unavailable when resolving user in authMiddleware, attempting in-memory fallback');
      }

      if (!user) {
        if (Array.isArray(global.users)) {
          user = global.users.find(u => String(u.id) === String(decoded.id));
        }
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid token: user not found' });
      }

      // Normalize role to avoid case/whitespace mismatches
      const normalizedRole = (user.role || '').toString().toLowerCase().trim();

      req.user = {
        id: user.id,
        role: normalizedRole,
        rawRole: user.role,
        email: user.email,
        username: user.username,
      };

      if (requiredRole) {
        const requiredNormalized = requiredRole.toString().toLowerCase().trim();
        if (normalizedRole !== requiredNormalized) {
          return res.status(403).json({ error: 'Access denied: insufficient permissions' });
        }
      }

      next();
    } catch (err) {
      console.error('Auth error:', err);
      return res.status(401).json({ error: 'Token invalid or expired' });
    }
  };
}

module.exports = authMiddleware;
