const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize'); // ADD THIS
const User = require('../models/user');
const Patient = require('../models/patient');
const Doctor = require('../models/doctor');
const LabTechnician = require('../models/labTechnician');
const Receptionist = require('../models/receptionist');

const config = require('../config/config');

const generateRoleId = (role, id) => {
  const rolePrefix = {
    'patient': 'PAT',
    'doctor': 'DOC', 
    'lab_technician': 'LAB',
    'receptionist': 'REC',
    'admin': 'ADM',
    'pharmacist': 'PHA'
  };
  return `${rolePrefix[role] || 'USR'}${String(id).padStart(6, '0')}`;
};

// FIXED LOGIN FUNCTION
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔵 Login attempt for:', email);

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // FIX: Find user by email OR username (patients might use either)
    let user = await User.findOne({
      where: {
        [Op.or]: [
          { email: email.toLowerCase().trim() },
          { username: email }
        ]
      }
    });

    // If not found in DB, fallback to in-memory users (useful when DB is not available or in demo mode)
    if (!user) {
      console.log('🟡 No DB user found, checking in-memory users...');
      if (global && Array.isArray(global.users)) {
        const memUser = global.users.find(u => (u.email && u.email.toLowerCase() === email.toLowerCase().trim()) || (u.username && u.username === email));
        if (memUser) {
          console.log('🟢 Found user in in-memory store:', memUser.email);
          // Normalize into a Sequelize-like object for downstream code
          user = {
            id: memUser.id,
            email: memUser.email,
            username: memUser.username || (memUser.email ? memUser.email.split('@')[0] : undefined),
            // Support both in-memory fields: some code uses `password`, others `password_hash`
          password_hash: memUser.password || memUser.password_hash, // note: in-memory may use 'password' or 'password_hash' for hashed pwd
            role: memUser.role || 'patient',
            first_name: memUser.first_name || (memUser.name ? memUser.name.split(' ')[0] : ''),
            last_name: memUser.last_name || (memUser.name ? memUser.name.split(' ')[1] : ''),
            phone: memUser.phone || null,
            is_active: memUser.isActive !== undefined ? memUser.isActive : true,
            // Provide an update method that updates the in-memory store
            update: async (updateObj) => {
              try {
                Object.assign(memUser, {
                  ...memUser,
                  lastLogin: updateObj.last_login || memUser.lastLogin,
                  isActive: updateObj.is_active !== undefined ? updateObj.is_active : memUser.isActive
                });
                return memUser;
              } catch (err) {
                console.error('🟡 Failed to update in-memory user:', err);
                return memUser;
              }
            }
          };
        }
      }
    }

    if (!user) {
      console.log('🔴 User not found:', email);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    console.log('🟢 User found:', {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      is_active: user.is_active
    });

    // Check if user is active
    if (!user.is_active) {
      console.log('🔴 User account inactive:', user.email);
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated. Please contact administration.'
      });
    }

    // FIX: Enhanced password debugging
    console.log('🟡 Password comparison details:');
    console.log('🟡 Input password:', password);
    console.log('🟡 Stored hash exists:', !!user.password_hash);
    console.log('🟡 Stored hash length:', user.password_hash ? user.password_hash.length : 0);
    
    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    console.log('🟡 Password validation result:', isMatch);

    if (!isMatch) {
      console.log('🔴 Password mismatch for user:', user.email);
      
      // Debug: Check if it's a common password issue
      const commonPasswords = ['password123', 'Password123', 'password', 'Password'];
      for (const commonPwd of commonPasswords) {
        const testMatch = await bcrypt.compare(commonPwd, user.password_hash);
        if (testMatch) {
          console.log('🟡 Common password match found:', commonPwd);
        }
      }
      
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Update last login
    await user.update({ last_login: new Date() });

    // FIX: Handle attendance for non-patient users (with error handling)
    if (user.role !== 'patient') {
      const today = new Date().toISOString().split('T')[0];
      
      try {
        // Check if AttendanceLog model exists to avoid errors
        let AttendanceLog;
        try {
          AttendanceLog = require('../models/attendanceLog');
        } catch (e) {
          console.log('🟡 AttendanceLog model not found, skipping attendance tracking');
        }
        
        if (AttendanceLog) {
          let attendanceRecord = await AttendanceLog.findOne({
            where: {
              userId: user.id,
              date: today
            }
          });

          if (!attendanceRecord) {
            const checkInTime = new Date();
            const expectedStartTime = new Date();
            expectedStartTime.setHours(2, 0, 0, 0);
            
            const lateThreshold = new Date();
            lateThreshold.setHours(2, 15, 0, 0);
            
            let status = 'present';
            let notes = null;
            
            if (checkInTime > lateThreshold) {
              status = 'late';
              notes = `Late check-in at ${checkInTime.toLocaleTimeString()}`;
            }
            
            attendanceRecord = await AttendanceLog.create({
              userId: user.id,
              date: today,
              checkIn: checkInTime,
              status: status,
              notes: notes
            });
          } else if (!attendanceRecord.checkIn) {
            const checkInTime = new Date();
            const expectedStartTime = new Date();
            expectedStartTime.setHours(2, 0, 0, 0);
            
            const lateThreshold = new Date();
            lateThreshold.setHours(2, 15, 0, 0);
            
            let status = 'present';
            let notes = null;
            
            if (checkInTime > lateThreshold) {
              status = 'late';
              notes = `Late check-in at ${checkInTime.toLocaleTimeString()}`;
            }
            
            await attendanceRecord.update({
              checkIn: checkInTime,
              status: status,
              notes: notes
            });
          }
        }
      } catch (attendanceError) {
        console.error('🔴 Failed to track attendance:', attendanceError);
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    console.log('🟢 Login successful for:', user.email);

    res.json({ 
      success: true,
      message: 'Login successful', 
      token, 
      user: { 
        id: user.id, 
        employee_id: user.employee_id,
        username: user.username,
        email: user.email, 
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone
      } 
    });
  } catch (err) {
    console.error('🔴 Login error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: err.message 
    });
  }
};

// ADD THESE NEW FUNCTIONS FOR DEBUGGING

// Test patient login specifically
exports.testPatientLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🧪 Testing patient login for:', email);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find patient user
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: email.toLowerCase().trim() },
          { username: email }
        ],
        role: 'patient'
      }
    });

    if (!user) {
      console.log('🔴 Patient not found:', email);
      return res.status(401).json({
        success: false,
        error: 'Patient not found'
      });
    }

    console.log('🟢 Patient user found:', {
      id: user.id,
      email: user.email,
      username: user.username,
      is_active: user.is_active,
      employee_id: user.employee_id
    });

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    console.log('🧪 Password validation result:', isMatch);

    if (!isMatch) {
      // Debug: Let's check what's in the database
      console.log('🔴 Password mismatch for patient:', user.email);
      console.log('🧪 Stored password hash exists:', !!user.password_hash);
      console.log('🧪 Stored hash length:', user.password_hash ? user.password_hash.length : 0);
      
      // Test with common passwords
      const testPasswords = ['password123', 'Password123', 'password', 'Password', 'temp123', 'Temp123'];
      for (const testPwd of testPasswords) {
        const testResult = await bcrypt.compare(testPwd, user.password_hash);
        if (testResult) {
          console.log('🟡 Common password worked:', testPwd);
        }
      }
      
      return res.status(401).json({
        success: false,
        error: 'Invalid password'
      });
    }

    res.json({
      success: true,
      message: 'Patient login test successful',
      patient: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        patientId: user.employee_id
      }
    });

  } catch (error) {
    console.error('🔴 Test patient login error:', error);
    res.status(500).json({
      success: false,
      error: 'Test login failed',
      details: error.message
    });
  }
};

// Debug user credentials
exports.debugUser = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: email.toLowerCase().trim() },
          { username: email }
        ]
      },
      attributes: ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'employee_id', 'is_active', 'password_hash']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        employee_id: user.employee_id,
        is_active: user.is_active,
        hasPassword: !!user.password_hash,
        passwordHashLength: user.password_hash ? user.password_hash.length : 0,
        isBcryptHash: user.password_hash ? user.password_hash.startsWith('$2b$') : false
      }
    });
  } catch (error) {
    console.error('🔴 Debug user error:', error);
    res.status(500).json({
      success: false,
      error: 'Debug failed',
      details: error.message
    });
  }
};

// Forgot password - send reset link to user's email
const { sendEmail } = require('../utils/emailService');

exports.forgotPassword = async (req, res) => {
  try {
      // If admin-only resets are enabled, refuse self-service reset
    if (config && config.adminOnlyPasswordReset) {
      return res.status(403).json({ success: false, error: 'Self-service password reset is disabled. Please contact your administrator.' });
    }
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    let user = await User.findOne({
      where: {
        [Op.or]: [
          { email: email.toLowerCase().trim() },
          { username: email }
        ]
      }
    });

    // Fallback to in-memory users if DB user not found (useful in demo mode)
    if (!user && global && Array.isArray(global.users)) {
      user = global.users.find(u => (u.email && u.email.toLowerCase() === email.toLowerCase()) || (u.username && u.username === email));
    }

    console.log('🔵 forgotPassword: user found?', !!user, 'user sample:', user ? { id: user.id, email: user.email } : null, 'providedEmail:', email);

    // For security, do not reveal whether the email exists; create token that encodes id if we have a user, else encode the email
    const tokenPayload = user ? { id: user.id } : { email: email.toLowerCase().trim() };
    const token = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: '1h' });

    // Build reset URL using frontend route - use query param (?token=...) to avoid path truncation with JWTs
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

    const subject = 'Password reset instructions';
    const text = `You requested a password reset. Click the link to reset your password: ${resetUrl}\nIf you did not request this, please ignore this email.`;
    const html = `<p>You requested a password reset. Click the link to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour.</p>`;

    // Use the provided email when no DB user exists (do not reveal existence)
    const recipientEmail = user && user.email ? user.email : email.toLowerCase().trim();
    console.log('🔵 forgotPassword recipient:', recipientEmail, 'userExists:', !!user);

    try {
      await sendEmail({ to: recipientEmail, subject, text, html });
      console.log('📧 Password reset email sent to:', recipientEmail);
    } catch (emailErr) {
      // Log error but do not fail the request - don't reveal issues to end users
      console.error('🔴 Failed to send password reset email (SMTP issue):', emailErr);
      if (emailErr && emailErr.stack) console.error(emailErr.stack);
      console.warn('🔸 Email setup may be missing or incorrect. Set EMAIL_USER and EMAIL_PASS in environment to enable email delivery.');
      // Return success for UX while logging the failure for developers
      return res.json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' });
    }

    res.json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('🔴 Forgot password error:', error);
    res.status(500).json({ success: false, error: 'Failed to process request' });
  }
};

// Verify reset token endpoint
exports.verifyResetToken = async (req, res) => {
  try {
    // If admin-only resets are enabled, refuse token verification for self-service resets
    if (config && config.adminOnlyPasswordReset) {
      return res.status(403).json({ success: false, error: 'Self-service password reset is disabled. Please contact your administrator.' });
    }
    // Accept token from URL param, query string, request body, or Authorization header
    let token = req.params.token || req.query.token || req.body && req.body.token || (req.headers.authorization ? req.headers.authorization.replace(/^Bearer\s+/i, '') : null);
    console.log('🔎 verifyResetToken called. token sources - params:', !!req.params.token, 'query:', !!req.query.token, 'body:', !!(req.body && req.body.token), 'authHeader:', !!req.headers.authorization);

    // Fallback: sometimes proxies or shells alter query parsing, so attempt to extract from raw URL
    if (!token && req.originalUrl && req.originalUrl.includes('token=')) {
      const m = req.originalUrl.match(/[?&]token=([^&]+)/);
      if (m && m[1]) {
        token = decodeURIComponent(m[1]);
        console.log('🔎 Fallback token parsed from raw URL');
      }
    }

    if (!token) return res.status(400).json({ success: false, error: 'Token is required' });
    console.log('🔎 verify token value preview:', token ? token.slice(0, 12) : null, 'len:', token ? token.length : 0, 'raw:', token ? JSON.stringify(token) : null);

    // Attempt to verify token directly, and try a few decode passes if it fails (handles double-encoding / shell mangling)
    let payload = null;
    let attemptToken = token;
    let verifyErr = null;

    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        // trim and normalize common mangles
        attemptToken = attemptToken.trim();
        // If spaces appear (common when + becomes spaces), re-encode
        if (attemptToken.includes(' ')) attemptToken = attemptToken.replace(/ /g, '+');

        console.log(`🔁 verify attempt ${attempt + 1}: token preview: ${attemptToken.slice(0,12)}, len: ${attemptToken.length}`);
        payload = jwt.verify(attemptToken, config.jwtSecret);
        token = attemptToken; // use the verified variant
        verifyErr = null;
        console.log('✅ token verified on attempt', attempt + 1);
        break;
      } catch (err) {
        console.log('⚠️ verify attempt failed:', err.message);
        verifyErr = err;
        try {
          attemptToken = decodeURIComponent(attemptToken);
          console.log('🔁 decoded token for next attempt');
        } catch (decodeErr) {
          console.log('🔴 decode failed:', decodeErr.message);
          // If decoding fails, break early
          break;
        }
      }
    }

    if (!payload) {
      console.error('🔴 Token verification failed:', verifyErr ? verifyErr.message : 'unknown');
      return res.status(400).json({ success: false, error: 'Invalid or expired token' });
    }

    // Optional: verify user still exists (support token by id or by email)
    let user = null;
    if (payload.id) {
      user = await User.findByPk(payload.id);
    } else if (payload.email) {
      user = await User.findOne({ where: { email: payload.email } });
      if (!user && global && Array.isArray(global.users)) {
        user = global.users.find(u => u.email && u.email.toLowerCase() === payload.email.toLowerCase());
      }
    }

    if (!user) return res.status(404).json({ success: false, error: 'Invalid token' });

    res.json({ success: true, message: 'Token valid' });
  } catch (error) {
    console.error('🔴 Verify token error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Reset user password (accepts token + newPassword)
exports.resetPassword = async (req, res) => {
  try {
    // If admin-only resets are enabled, disallow direct resets via token
    if (config && config.adminOnlyPasswordReset) {
      return res.status(403).json({ success: false, error: 'Self-service password reset is disabled. Please contact your administrator.' });
    }
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ success: false, error: 'Token and new password are required' });
    }

    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch (err) {
      console.error('🔴 Reset token invalid:', err.message);
      return res.status(400).json({ success: false, error: 'Invalid or expired token' });
    }

    // Find user by id or email (support in-memory fallback)
    let user = null;
    if (payload.id) {
      user = await User.findByPk(payload.id);
    } else if (payload.email) {
      user = await User.findOne({ where: { email: payload.email } });
      if (!user && global && Array.isArray(global.users)) {
        user = global.users.find(u => u.email && u.email.toLowerCase() === payload.email.toLowerCase());
      }
    }

    if (!user) {
      console.error('🔴 User not found for reset payload:', payload);
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // If user is a DB instance update, else if it's an in-memory object update that object
    if (user.update) {
      await user.update({ password_hash: hashedPassword });
    } else {
      // in-memory user: store under password_hash to match login expectations
      user.password_hash = hashedPassword;
    }

    console.log('🟢 Password reset for user:', user.email);

    // Build a sanitized user response
    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name || user.first_name || user.username || '',
      role: user.role || 'patient',
      clinicId: user.clinicId || user.clinic_id || null
    };

    // Generate auth token to optionally auto-login the user after reset
    const authToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    res.json({ success: true, message: 'Password reset successfully', token: authToken, user: userResponse });
  } catch (error) {
    console.error('🔴 Reset password error:', error);
    res.status(500).json({ success: false, error: 'Password reset failed', details: error.message });
  }
};

// Keep your existing register function exactly as is
exports.register = async (req, res) => {
  try {
    const { username, email, password, role, first_name, last_name, phone } = req.body;
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }
    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already in use' });
    }
    // Let the model hook handle hashing; pass the raw password into password_hash
    const newUser = await User.create({
      username,
      email,
      password_hash: password,
      role,
      first_name,
      last_name,
      phone,
      is_active: true
    });

    const employeeId = generateRoleId(role, newUser.id);
    
    await newUser.update({ employee_id: employeeId });

    const roleSpecificId = employeeId;

    let roleRecord = null;
    try {
      switch (newUser.role) {
        case 'patient':
          const { date_of_birth, gender, ...patientData } = req.body;
          if (!date_of_birth || !gender) {
            await newUser.destroy(); 
            return res.status(400).json({ 
              error: 'Date of birth and gender are required for patient registration' 
            });
          }
          roleRecord = await Patient.create({
            id: newUser.id,
            patient_id: roleSpecificId,
            date_of_birth,
            gender,
            ...patientData
          });
          break;
        
        case 'doctor':
          const { specialization, license_number, ...doctorData } = req.body;
          if (!specialization || !license_number) {
            await newUser.destroy();
            return res.status(400).json({ 
              error: 'Specialization and license number are required for doctor registration' 
            });
          }
          roleRecord = await Doctor.create({
            id: newUser.id,
            doctor_id: roleSpecificId,
            specialization,
            license_number,
            ...doctorData
          });
          break;
        
        case 'lab_technician':
          roleRecord = await LabTechnician.create({
            id: newUser.id,
            technician_id: roleSpecificId,
            specialization: req.body.specialization,
            license_number: req.body.license_number,
            years_of_experience: req.body.years_of_experience,
            certifications: req.body.certifications
          });
          break;
        
        case 'receptionist':
          roleRecord = await Receptionist.create({
            id: newUser.id,
            receptionist_id: roleSpecificId,
            department: req.body.department,
            shift_start: req.body.shift_start,
            shift_end: req.body.shift_end
          });
          break;
      }
    } catch (roleError) {
      console.error('Error creating role-specific record:', roleError);
      await newUser.destroy();
      return res.status(500).json({ 
        error: 'Failed to create role-specific record: ' + roleError.message 
      });
    }

    res.status(201).json({ 
      message: 'User registered successfully', 
      user: {
        id: newUser.id,
        employee_id: employeeId,
        roleSpecificId,
        patientId: newUser.role === 'patient' ? roleSpecificId : undefined,
        doctorId: newUser.role === 'doctor' ? roleSpecificId : undefined,
        labTechId: newUser.role === 'lab_technician' ? roleSpecificId : undefined,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        phone: newUser.phone
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Keep your existing logout function
exports.logout = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role !== 'patient') {
      const today = new Date().toISOString().split('T')[0];
      
      try {
        const AttendanceLog = require('../models/attendanceLog');
        const attendanceRecord = await AttendanceLog.findOne({
          where: {
            userId: userId,
            date: today
          }
        });

        if (attendanceRecord && attendanceRecord.checkIn && !attendanceRecord.checkOut) {
          const checkOutTime = new Date();
          
          const checkInTime = new Date(attendanceRecord.checkIn);
          const diffMs = checkOutTime - checkInTime;
          const totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
          
          await attendanceRecord.update({
            checkOut: checkOutTime,
            workingHours: totalHours,
            notes: attendanceRecord.notes ? 
              `${attendanceRecord.notes}. Check-out at ${checkOutTime.toLocaleTimeString()}` :
              `Check-out at ${checkOutTime.toLocaleTimeString()}`
          });
        }
      } catch (attendanceError) {
        console.error('Failed to track checkout:', attendanceError);
      }
    }

    res.json({ message: 'Logout successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};