// routes/users.js
const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middlewares/authMiddleware');

// Create user route - Updated to match your User model
router.post('/admin/users', authMiddleware, async (req, res) => {
  try {
    console.log('🎯 USER CREATION ROUTE HIT - /admin/users');
    console.log('📦 Request body:', req.body);
    console.log('👤 Authenticated user:', req.user);

    const { 
      email, 
      password, 
      username, 
      first_name, 
      last_name, 
      role, 
      phone, 
      age, 
      employee_id 
    } = req.body;

    console.log('📝 Creating user with data:', { 
      email, 
      username, 
      first_name, 
      last_name, 
      role 
    });

    // Validate required fields
    if (!email || !password || !username || !first_name || !last_name || !role) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'Email, password, username, first name, last name, and role are required'
      });
    }

    // Check if user already exists by email or username
    const existingUser = await User.findOne({ 
      where: { 
        $or: [
          { email: email.toLowerCase() },
          { username: username }
        ]
      } 
    });
    
    if (existingUser) {
      console.log('❌ User already exists');
      return res.status(400).json({
        success: false,
        error: 'User with this email or username already exists'
      });
    }

    // Hash the password to password_hash field
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    console.log('🔐 Password hashed successfully');

    // Create user with correct field names matching your model
    const user = await User.create({
      email: email.toLowerCase(),
      password_hash, // Correct field name for your model
      username,
      first_name,
      last_name,
      role,
      phone: phone || null,
      age: age || null,
      employee_id: employee_id || null,
      is_active: true
    });

    console.log('✅ User created successfully:', user.id);

    // Return user without password hash
    const userResponse = { ...user.toJSON() };
    delete userResponse.password_hash;

    res.json({
      success: true,
      data: userResponse,
      message: 'User created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating user:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message
    });
  }
});

// ... rest of your routes remain the same