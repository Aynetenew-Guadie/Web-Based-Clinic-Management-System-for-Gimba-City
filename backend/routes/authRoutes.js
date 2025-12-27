const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Make sure to import your User model

router.post('/register', authController.register);

// Updated login route with proper password handling
// Route login requests through the central controller so we maintain consistent behavior and detailed logging
router.post('/login', authController.login);

// Password reset endpoints
router.post('/forgot-password', authController.forgotPassword);
router.get('/verify-reset-token', authController.verifyResetToken);
// Also accept token as a path parameter for compatibility with some clients
router.get('/verify-reset-token/:token', authController.verifyResetToken);
router.post('/reset-password', authController.resetPassword);

router.post('/logout', authMiddleware, authController.logout);

// Debug routes (development only)
router.get('/debug/user/:email', async (req, res) => {
  try {
    const user = await User.findOne({ 
      where: { email: req.params.email }
    });
    
    if (!user) {
      return res.json({ 
        exists: false,
        message: 'User not found in database'
      });
    }
    
    res.json({
      exists: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_active: user.is_active,
        phone: user.phone,
        employee_id: user.employee_id,
        clinic_id: user.clinic_id,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
        // Note: Not including password for security
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST debug that returns password hash and metadata (dev only)
router.post('/debug-user', authController.debugUser);

module.exports = router;