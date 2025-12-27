function roleMiddleware(allowedRoles) {
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
    throw new Error('roleMiddleware requires a non-empty array of allowed roles');
  }

  return function (req, res, next) {
    try {
      if (!req.user || !req.user.role) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Normalize allowed roles and compare to normalized user role
      const normalizedAllowed = allowedRoles.map(r => r.toString().toLowerCase().trim());
      const userRole = (req.user.role || '').toString().toLowerCase().trim();

      if (!normalizedAllowed.includes(userRole)) {
        console.warn(`[ROLE DENY] User ${req.user.id || 'unknown'} has role='${req.user.role}' which is not in allowed roles: ${JSON.stringify(allowedRoles)}`);
        const payload = { error: 'Access denied: insufficient permissions' };
        if (process.env.NODE_ENV !== 'production') payload.role = req.user.role;
        return res.status(403).json(payload);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = roleMiddleware;
