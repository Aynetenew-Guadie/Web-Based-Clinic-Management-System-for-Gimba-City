const { User, Appointment, Billing, Patient } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { sendEmail } = require('../utils/emailService');

// User Management
exports.getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password_hash'] },
      order: [['createdAt', 'DESC']]
    });

    const usersWithFormattedData = users.map(user => {
      const userData = user.toJSON();
      return {
        ...userData,
        firstName: userData.first_name,
        lastName: userData.last_name,
        roleSpecificId: userData.employee_id,
        isActive: userData.is_active
      };
    });

    res.json({
      success: true,
      users: usersWithFormattedData,
      total: users.length
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

exports.createUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      role,
      specialization,
      department,
      isActive = true
    } = req.body;

    // Normalize email to lower-case and trimmed to avoid case-sensitivity issues
    const normalizedEmail = email ? email.toLowerCase().trim() : email;

    // Check if user already exists
    const existingUser = await User.findOne({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Generate username and determine password (use provided password if present)
    const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${Date.now().toString().slice(-4)}`;
    const defaultPassword = 'password123';
    const passwordPlain = req.body.password && req.body.password.trim() ? req.body.password : defaultPassword;
    const password_hash = await bcrypt.hash(passwordPlain, 10);

    // Create user - persist normalized email
    const user = await User.create({
      username,
      email: normalizedEmail,
      password_hash,
      role: role || 'patient',
      first_name: firstName,
      last_name: lastName,
      phone: phone || null,
      specialization: specialization || null,
      department: department || null,
      is_active: isActive,
    });

    // Generate role-specific ID
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

    const employeeId = generateRoleId(user.role, user.id);
    await user.update({ employee_id: employeeId });

    // Send a welcome/reset email to the new user with their temporary password and a reset link
    let emailSent = false;
    try {
      const token = jwt.sign({ id: user.id }, config.jwtSecret, { expiresIn: '1h' });
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
      const subject = 'Welcome to Clinic Management System - set your password';
      const text = `An account was created for you. Your temporary password is: ${passwordPlain}. Please set a new password here: ${resetUrl}`;
      const html = `<p>An account was created for you.</p><p>Your temporary password is: <strong>${passwordPlain}</strong></p><p>Set a new password here: <a href="${resetUrl}">${resetUrl}</a></p><p>The link expires in 1 hour.</p>`;
      await sendEmail({ to: user.email, subject, text, html });
      emailSent = true;
      console.log('📧 Welcome email sent to:', user.email);
    } catch (emailErr) {
      console.warn('⚠️ Failed to send welcome email to', user.email, '-', emailErr && emailErr.message ? emailErr.message : emailErr);
    }

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password_hash;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      emailSent,
      user: {
        ...userResponse,
        firstName: userResponse.first_name,
        lastName: userResponse.last_name,
        roleSpecificId: userResponse.employee_id,
        isActive: userResponse.is_active
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: error.message
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      email,
      phone,
      role,
      specialization,
      department,
      isActive,
      password
    } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Normalize and check if email is already taken by another user
    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      if (normalizedEmail !== user.email) {
        const existingUser = await User.findOne({ where: { email: normalizedEmail } });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Email already taken by another user'
          });
        }
      }
    }

    // Update user
    const updateData = {};
    if (firstName) updateData.first_name = firstName;
    if (lastName) updateData.last_name = lastName;
    if (email) updateData.email = email ? email.toLowerCase().trim() : email;
    if (phone !== undefined) updateData.phone = phone;
    if (role) updateData.role = role;
    if (specialization !== undefined) updateData.specialization = specialization;
    if (department !== undefined) updateData.department = department;
    if (isActive !== undefined) updateData.is_active = isActive;

    // Allow admin to set or reset password
    if (password !== undefined && password !== null && password !== '') {
      const newHash = await bcrypt.hash(password, 10);
      updateData.password_hash = newHash;
    }

    await user.update(updateData);

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password_hash;

    res.json({
      success: true,
      message: 'User updated successfully',
      user: {
        ...userResponse,
        firstName: userResponse.first_name,
        lastName: userResponse.last_name,
        roleSpecificId: userResponse.employee_id,
        isActive: userResponse.is_active
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message
    });
  }
};

exports.resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const generatePassword = () => {
      // Generate a 12-char password with letters and numbers
      const raw = require('crypto').randomBytes(9).toString('base64');
      return raw.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'TempPass123!';
    };

    const newPassword = password && password.trim() ? password : generatePassword();
    const newHash = await bcrypt.hash(newPassword, 10);
    await user.update({ password_hash: newHash });

    // Audit/log the reset with admin id if available
    try {
      const adminId = req.user ? req.user.id : 'unknown';
      console.log(`[ADMIN RESET] Admin ${adminId} reset password for user ${user.id}`);
    } catch (logErr) {
      console.warn('Failed to log admin reset event', logErr);
    }

    // Send notification email to the user with the temporary password and reset link
    let emailSent = false;
    try {
      const token = jwt.sign({ id: user.id }, config.jwtSecret, { expiresIn: '1h' });
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
      const subject = 'Your password has been reset by admin';
      const text = `Your password was reset by an administrator. Your temporary password is: ${newPassword}. Please set a new password here: ${resetUrl}`;
      const html = `<p>Your password was reset by an administrator.</p><p>Your temporary password is: <strong>${newPassword}</strong></p><p>Set a new password here: <a href="${resetUrl}">${resetUrl}</a></p><p>The link expires in 1 hour.</p>`;
      await sendEmail({ to: user.email, subject, text, html });
      emailSent = true;
      console.log('📧 Reset password email sent to:', user.email);
    } catch (emailErr) {
      console.warn('⚠️ Failed to send reset email to', user.email, '-', emailErr && emailErr.message ? emailErr.message : emailErr);
    }

    res.json({ success: true, message: 'Password reset successfully', generatedPassword: newPassword, emailSent });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password',
      error: error.message
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deletion of own account
    if (parseInt(id) === parseInt(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    await user.destroy();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
};

exports.getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.count();
    const patients = await User.count({ where: { role: 'patient' } });
    const doctors = await User.count({ where: { role: 'doctor' } });
    const receptionists = await User.count({ where: { role: 'receptionist' } });
    const admins = await User.count({ where: { role: 'admin' } });
    const activeUsers = await User.count({ where: { is_active: true } });

    res.json({
      success: true,
      stats: {
        totalUsers,
        patients,
        doctors,
        receptionists,
        admins,
        activeUsers
      }
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user statistics',
      error: error.message
    });
  }
};

// Billing Management
exports.getAllBilling = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const whereClause = {};
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    
    const offset = (page - 1) * limit;
    
    const { count, rows: billingRecords } = await Billing.findAndCountAll({
      where: whereClause,
      include: [
        { 
          model: User, 
          as: 'patient', 
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'employee_id'] 
        },
        { 
          model: User, 
          as: 'doctor', 
          attributes: ['id', 'first_name', 'last_name', 'employee_id'] 
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const billingArray = billingRecords.map(bill => ({
      id: bill.id,
      patient: bill.patient ? {
        id: bill.patient.id,
        firstName: bill.patient.first_name,
        lastName: bill.patient.last_name,
        patientId: bill.patient.employee_id
      } : null,
      doctor: bill.doctor ? {
        id: bill.doctor.id,
        firstName: bill.doctor.first_name,
        lastName: bill.doctor.last_name,
        doctorId: bill.doctor.employee_id
      } : null,
      appointmentId: bill.appointmentId,
      serviceType: bill.serviceType,
      description: bill.description,
      amount: parseFloat(bill.amount),
      status: bill.status,
      invoiceNumber: bill.invoiceNumber,
      date: bill.date,
      dueDate: bill.dueDate,
      createdAt: bill.createdAt
    }));

    // Calculate billing overview
    const totalAmount = billingArray.reduce((sum, bill) => sum + (bill.amount || 0), 0);
    const paidAmount = billingArray
      .filter(bill => bill.status === 'paid')
      .reduce((sum, bill) => sum + (bill.amount || 0), 0);
    const pendingAmount = billingArray
      .filter(bill => bill.status === 'pending')
      .reduce((sum, bill) => sum + (bill.amount || 0), 0);

    res.json({
      success: true,
      billing: billingArray, // Ensure this is always an array
      overview: {
        total: totalAmount,
        paid: paidAmount,
        pending: pendingAmount
      },
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching billing records:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching billing records',
      error: error.message
    });
  }
};

exports.getBillingStats = async (req, res) => {
  try {
    const totalBilling = await Billing.sum('amount') || 0;
    const paidBilling = await Billing.sum('amount', { 
      where: { status: 'paid' } 
    }) || 0;
    const pendingBilling = await Billing.sum('amount', { 
      where: { status: 'pending' } 
    }) || 0;
    const totalInvoices = await Billing.count();

    const monthlyStats = await Billing.findAll({
      attributes: [
        [Billing.sequelize.fn('DATE_FORMAT', Billing.sequelize.col('date'), '%Y-%m'), 'month'],
        [Billing.sequelize.fn('SUM', Billing.sequelize.col('amount')), 'total']
      ],
      where: {
        date: {
          [Op.gte]: new Date(new Date().getFullYear(), 0, 1) // Current year
        }
      },
      group: [Billing.sequelize.fn('DATE_FORMAT', Billing.sequelize.col('date'), '%Y-%m')],
      order: [[Billing.sequelize.fn('DATE_FORMAT', Billing.sequelize.col('date'), '%Y-%m'), 'ASC']]
    });

    res.json({
      success: true,
      stats: {
        total: parseFloat(totalBilling),
        paid: parseFloat(paidBilling),
        pending: parseFloat(pendingBilling),
        totalInvoices,
        monthlyStats
      }
    });
  } catch (error) {
    console.error('Error fetching billing stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching billing statistics',
      error: error.message
    });
  }
};

exports.updateBilling = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, status, description, serviceType } = req.body;

    const billing = await Billing.findByPk(id);
    if (!billing) {
      return res.status(404).json({
        success: false,
        message: 'Billing record not found'
      });
    }

    const updateData = {};
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (status) updateData.status = status;
    if (description) updateData.description = description;
    if (serviceType) updateData.serviceType = serviceType;

    await billing.update(updateData);

    res.json({
      success: true,
      message: 'Billing record updated successfully',
      billing
    });
  } catch (error) {
    console.error('Error updating billing:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating billing record',
      error: error.message
    });
  }
};

exports.deleteBilling = async (req, res) => {
  try {
    const { id } = req.params;

    const billing = await Billing.findByPk(id);
    if (!billing) {
      return res.status(404).json({
        success: false,
        message: 'Billing record not found'
      });
    }

    await billing.destroy();

    res.json({
      success: true,
      message: 'Billing record deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting billing:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting billing record',
      error: error.message
    });
  }
};

// Settings Management
exports.getSettings = async (req, res) => {
  try {
    // Return default settings - you can extend this to use a Settings model
    const settings = {
      hospitalName: 'MedCare Hospital',
      hospitalAddress: '123 Healthcare St, Medical City',
      hospitalPhone: '+1-555-0123',
      hospitalEmail: 'info@medcarehospital.com',
      appointmentDuration: 30,
      workingHours: {
        start: '08:00',
        end: '18:00'
      },
      billing: {
        consultationFee: 50,
        emergencyFee: 100,
        followUpFee: 30
      }
    };

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching settings',
      error: error.message
    });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const settings = req.body;

    // Here you would typically save to a Settings model
    // For now, we'll just return success

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating settings',
      error: error.message
    });
  }
};

// Dashboard Statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalPatients = await User.count({ where: { role: 'patient' } });
    const totalDoctors = await User.count({ where: { role: 'doctor' } });
    const totalAppointments = await Appointment.count();
    const todayAppointments = await Appointment.count({
      where: {
        appointmentDate: {
          [Op.gte]: today
        }
      }
    });

    const totalRevenue = await Billing.sum('amount', {
      where: { status: 'paid' }
    }) || 0;

    const pendingBills = await Billing.count({
      where: { status: 'pending' }
    });

    res.json({
      success: true,
      stats: {
        totalPatients,
        totalDoctors,
        totalAppointments,
        todayAppointments,
        totalRevenue: parseFloat(totalRevenue),
        pendingBills
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message
    });
  }
};