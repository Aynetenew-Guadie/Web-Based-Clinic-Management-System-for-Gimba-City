const User = require('../models/user');
const Appointment = require('../models/appointment');
const AppointmentRequest = require('../models/appointmentRequest');
const Billing = require('../models/billing');
const { sendEmail } = require('../utils/emailService');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs'); // ADDED AT TOP LEVEL

let Patient;
try { Patient = require('../models/patient'); } catch (_) { Patient = null }

// ADD THIS UTILITY FUNCTION (keep all existing code)
const generateSecurePassword = (length = 10) => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

// ADD THESE MISSING CONTROLLER FUNCTIONS:

// Patient Management - FIXED VERSION (ONLY THIS FUNCTION CHANGED)
exports.registerPatient = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      address,
      emergencyContact,
      insuranceInfo
    } = req.body;

    // Check if patient already exists
    const existingPatient = await User.findOne({ 
      where: { 
        [Op.or]: [{ email }, { phone }] 
      } 
    });
    
    if (existingPatient) {
      return res.status(400).json({
        success: false,
        message: 'Patient with this email or phone already exists'
      });
    }

    // Generate username from first and last name
    const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${Date.now().toString().slice(-4)}`;
    
    // FIX: Generate secure random password instead of fixed 'password123'
    const tempPassword = generateSecurePassword();
    console.log('Generated temporary password for patient:', tempPassword);

    // NOTE: The User model has a beforeCreate hook that hashes `password_hash`.
    // Pass the raw temporary password into `password_hash` so the hook performs hashing once.
    const user = await User.create({
      username,
      email,
      password_hash: tempPassword,
      role: 'patient',
      first_name: firstName,
      last_name: lastName,
      phone,
      is_active: true,
    });

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

    // Create patient profile if Patient model exists
    if (Patient && dateOfBirth && gender) {
      try {
        await Patient.create({
          id: user.id,
          date_of_birth: dateOfBirth,
          gender,
          address: address || null,
          emergency_contact_name: emergencyContact?.name || null,
          emergency_contact_phone: emergencyContact?.phone || null,
          blood_type: insuranceInfo?.bloodType || null,
          allergies: insuranceInfo?.allergies || null,
          medical_history: insuranceInfo?.medicalHistory || null,
        });
      } catch (profileErr) {
        console.error('Failed to create patient profile:', profileErr);
      }
    }

    const roleSpecificId = employeeId;

    // FIX: Send email with temporary password
    try {
      await sendEmail({
        to: email,
        subject: 'Your Patient Account - Healthcare System',
        text: `Dear ${firstName} ${lastName},\n\nYour patient account has been created successfully.\n\nLogin Details:\nEmail: ${email}\nTemporary Password: ${tempPassword}\nPatient ID: ${roleSpecificId}\n\nPlease login and change your password immediately.\n\nBest regards,\nHealthcare Team`,
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2>Welcome to Our Healthcare System</h2>
            <p>Dear ${firstName} ${lastName},</p>
            <p>Your patient account has been created successfully.</p>
            <div style="background: #f5f5f5; padding: 15px; margin: 15px 0;">
              <h3>Your Login Details:</h3>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Temporary Password:</strong> ${tempPassword}</p>
              <p><strong>Patient ID:</strong> ${roleSpecificId}</p>
            </div>
            <p style="color: #d9534f;"><strong>Please login and change your password immediately.</strong></p>
          </div>
        `
      });
      console.log('Welcome email sent to patient:', email);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    res.status(201).json({ 
      success: true,
      message: 'Patient registered successfully', 
      patient: {
        id: user.id,
        patientId: roleSpecificId,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        employee_id: employeeId
      },
      // FIX: Include temporary password in response for receptionist
      temporaryPassword: tempPassword,
      instructions: 'Patient can login using email and the temporary password above. Please change password on first login.'
    });
  } catch (error) {
    console.error('Error registering patient:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error registering patient',
      details: error.message 
    });
  }
};

// Patient Login Debug Functions
exports.testPatientLogin = async (req, res) => {
  try {
    const { patientId, email } = req.body;
    
    let patient;
    if (patientId) {
      patient = await User.findOne({
        where: { 
          [Op.or]: [
            { employee_id: patientId },
            { id: patientId }
          ],
          role: 'patient'
        }
      });
    } else if (email) {
      patient = await User.findOne({
        where: { email, role: 'patient' }
      });
    }

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.json({
      success: true,
      patient: {
        id: patient.id,
        patientId: patient.employee_id,
        email: patient.email,
        firstName: patient.first_name,
        lastName: patient.last_name,
        username: patient.username,
        isActive: patient.is_active
      }
    });
  } catch (error) {
    console.error('Error testing patient login:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing patient login',
      error: error.message
    });
  }
};

exports.resetPatientPassword = async (req, res) => {
  try {
    const { patientId, email } = req.body;
    
    let patient;
    if (patientId) {
      patient = await User.findOne({
        where: { 
          [Op.or]: [
            { employee_id: patientId },
            { id: patientId }
          ],
          role: 'patient'
        }
      });
    } else if (email) {
      patient = await User.findOne({
        where: { email, role: 'patient' }
      });
    }

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    const tempPassword = generateSecurePassword();
    const password_hash = await bcrypt.hash(tempPassword, 12);

    await patient.update({ password_hash });

    // Send email with new temporary password
    try {
      await sendEmail({
        to: patient.email,
        subject: 'Password Reset - Healthcare System',
        text: `Dear ${patient.first_name},\n\nYour password has been reset.\n\nNew Temporary Password: ${tempPassword}\n\nPlease login and change your password immediately.\n\nBest regards,\nHealthcare Team`,
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2>Password Reset</h2>
            <p>Dear ${patient.first_name},</p>
            <p>Your password has been reset successfully.</p>
            <div style="background: #f5f5f5; padding: 15px; margin: 15px 0;">
              <h3>Your New Temporary Password:</h3>
              <p><strong>Password:</strong> ${tempPassword}</p>
            </div>
            <p style="color: #d9534f;"><strong>Please login and change your password immediately.</strong></p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
    }

    res.json({
      success: true,
      message: 'Patient password reset successfully',
      temporaryPassword: tempPassword
    });
  } catch (error) {
    console.error('Error resetting patient password:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting patient password',
      error: error.message
    });
  }
};

exports.debugPatientCredentials = async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const patient = await User.findOne({
      where: { 
        [Op.or]: [
          { employee_id: patientId },
          { id: patientId }
        ],
        role: 'patient'
      }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.json({
      success: true,
      patient: {
        id: patient.id,
        patientId: patient.employee_id,
        email: patient.email,
        username: patient.username,
        firstName: patient.first_name,
        lastName: patient.last_name,
        phone: patient.phone,
        isActive: patient.is_active,
        createdAt: patient.createdAt
      }
    });
  } catch (error) {
    console.error('Error debugging patient:', error);
    res.status(500).json({
      success: false,
      message: 'Error debugging patient',
      error: error.message
    });
  }
};

// ========== KEEP ALL YOUR EXISTING FUNCTIONS EXACTLY AS THEY ARE BELOW ==========

exports.getPatients = async (req, res) => {
  try {
    const patients = await User.findAll({
      where: { role: 'patient' },
      attributes: ['id', 'username', 'email', 'first_name', 'last_name', 'phone', 'employee_id', 'createdAt', 'role']
    });

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

    const patientsWithIds = patients.map(patient => {
      const patientData = patient.toJSON();
      patientData.patientId = generateRoleId(patientData.role, patientData.id);
      patientData.roleSpecificId = patientData.patientId;
      patientData.firstName = patientData.first_name;
      patientData.lastName = patientData.last_name;
      return patientData;
    });

    res.json({
      success: true,
      patients: patientsWithIds,
      total: patientsWithIds.length
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error fetching patients',
      details: error.message 
    });
  }
};

// Appointment Management
exports.scheduleAppointment = async (req, res) => {
  try {
    const {
      patientId,
      doctorId,
      appointmentDate,
      appointmentTime,
      reason,
      type
    } = req.body;

    // Convert PAT000123 format to numeric ID if needed
    let numericPatientId = patientId;
    if (typeof patientId === 'string' && patientId.startsWith('PAT')) {
      const numericId = patientId.replace('PAT', '').replace(/^0+/, '');
      numericPatientId = parseInt(numericId, 10);
    }

    let numericDoctorId = doctorId;
    if (doctorId && typeof doctorId === 'string' && doctorId.startsWith('DOC')) {
      const numericId = doctorId.replace('DOC', '').replace(/^0+/, '');
      numericDoctorId = parseInt(numericId, 10);
    }

    const appointment = await Appointment.create({
      patientId: numericPatientId,
      doctorId: numericDoctorId || null,
      appointmentDate: appointmentDate,
      startTime: appointmentTime,
      endTime: calculateEndTime(appointmentTime),
      durationMinutes: 30,
      visitType: type || 'consultation',
      status: 'scheduled',
      notes: reason,
      createdBy: req.user?.id || 1
    });

    res.status(201).json({
      success: true,
      message: 'Appointment scheduled successfully',
      appointment
    });
  } catch (error) {
    console.error('Error scheduling appointment:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error scheduling appointment',
      details: error.message 
    });
  }
};

exports.getScheduledAppointments = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const appointments = await Appointment.findAll({
      where: {
        appointmentDate: { [Op.gte]: today },
        status: { [Op.in]: ['scheduled', 'confirmed', 'waiting', 'in_progress'] }
      },
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
      order: [['appointmentDate', 'ASC'], ['startTime', 'ASC']],
    });

    const formattedAppointments = appointments.map(apt => ({
      id: apt.id,
      patient: apt.patient ? {
        id: apt.patient.id,
        firstName: apt.patient.first_name,
        lastName: apt.patient.last_name,
        email: apt.patient.email,
        phone: apt.patient.phone,
        patientId: apt.patient.employee_id
      } : null,
      doctor: apt.doctor ? {
        id: apt.doctor.id,
        firstName: apt.doctor.first_name,
        lastName: apt.doctor.last_name,
        doctorId: apt.doctor.employee_id
      } : null,
      appointmentDate: apt.appointmentDate,
      appointmentTime: apt.startTime,
      endTime: apt.endTime,
      status: apt.status,
      type: apt.visitType,
      reason: apt.notes
    }));

    res.json({
      success: true,
      appointments: formattedAppointments,
      total: formattedAppointments.length
    });
  } catch (error) {
    console.error('Error fetching scheduled appointments:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error fetching scheduled appointments',
      details: error.message 
    });
  }
};

// ADD THIS MISSING FUNCTION
exports.getAllAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.findAll({
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
      order: [['appointmentDate', 'DESC'], ['startTime', 'DESC']],
    });

    const formattedAppointments = appointments.map(apt => ({
      id: apt.id,
      patient: apt.patient ? {
        id: apt.patient.id,
        firstName: apt.patient.first_name,
        lastName: apt.patient.last_name,
        email: apt.patient.email,
        phone: apt.patient.phone,
        patientId: apt.patient.employee_id
      } : null,
      doctor: apt.doctor ? {
        id: apt.doctor.id,
        firstName: apt.doctor.first_name,
        lastName: apt.doctor.last_name,
        doctorId: apt.doctor.employee_id
      } : null,
      appointmentDate: apt.appointmentDate,
      appointmentTime: apt.startTime,
      endTime: apt.endTime,
      status: apt.status,
      type: apt.visitType,
      reason: apt.notes,
      createdAt: apt.createdAt
    }));

    res.json({
      success: true,
      appointments: formattedAppointments,
      total: formattedAppointments.length
    });
  } catch (error) {
    console.error('Error fetching all appointments:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error fetching appointments',
      details: error.message 
    });
  }
};

// Queue Management
exports.getPatientQueue = async (req, res) => {
  try {
    const allowedStatuses = ['scheduled', 'confirmed', 'waiting', 'in_progress', 'in_consultation'];
    
    const appointments = await Appointment.findAll({
      where: { status: { [Op.in]: allowedStatuses } },
      include: [
        { 
          model: User, 
          as: 'patient', 
          attributes: ['id', 'first_name', 'last_name', 'employee_id'] 
        },
        { 
          model: User, 
          as: 'doctor', 
          attributes: ['id', 'first_name', 'last_name', 'employee_id'] 
        }
      ],
      order: [['appointmentDate', 'ASC'], ['startTime', 'ASC']],
    });

    const queue = appointments.map(apt => ({
      id: apt.id,
      patient: apt.patient ? {
        id: apt.patient.id,
        firstName: apt.patient.first_name,
        lastName: apt.patient.last_name,
        patientId: apt.patient.employee_id
      } : null,
      doctor: apt.doctor ? {
        id: apt.doctor.id,
        firstName: apt.doctor.first_name,
        lastName: apt.doctor.last_name,
        doctorId: apt.doctor.employee_id
      } : null,
      appointmentDate: apt.appointmentDate,
      appointmentTime: apt.startTime,
      status: apt.status,
      type: apt.visitType
    }));

    res.json({
      success: true,
      queue,
      total: queue.length
    });
  } catch (error) {
    console.error('Error fetching patient queue:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error fetching patient queue',
      details: error.message 
    });
  }
};

exports.checkInPatient = async (req, res) => {
  try {
    const { appointmentId, patientId } = req.body;

    if (!appointmentId && !patientId) {
      return res.status(400).json({ 
        success: false,
        error: 'appointmentId or patientId is required' 
      });
    }

    let appointment;
    if (appointmentId) {
      appointment = await Appointment.findByPk(appointmentId);
    } else if (patientId) {
      appointment = await Appointment.findOne({
        where: { 
          patientId: patientId, 
          status: { [Op.in]: ['scheduled', 'confirmed'] } 
        },
        order: [['appointmentDate', 'DESC']]
      });
    }

    if (!appointment) {
      return res.status(404).json({ 
        success: false,
        error: 'Appointment not found' 
      });
    }

    await appointment.update({ status: 'checked_in' });

    res.json({ 
      success: true,
      message: 'Patient checked in successfully',
      appointment 
    });
  } catch (error) {
    console.error('Error during check-in:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error during check-in',
      details: error.message 
    });
  }
};

// Doctor Management
exports.getAvailableDoctors = async (req, res) => {
  try {
    const { date } = req.query;
    
    const doctors = await User.findAll({
      where: { role: 'doctor', is_active: true },
      attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'employee_id', 'specialization']
    });

    if (date) {
      const doctorsWithAvailability = await Promise.all(
        doctors.map(async (doctor) => {
            const appointments = await Appointment.findAll({
            where: {
              doctorId: doctor.id,
              appointmentDate: date,
              status: ['scheduled', 'confirmed', 'waiting', 'in_progress']
            }
          });
          
          return {
            id: doctor.id,
            firstName: doctor.first_name,
            lastName: doctor.last_name,
            email: doctor.email,
            phone: doctor.phone,
            doctorId: doctor.employee_id,
            specialization: doctor.specialization,
            appointments: appointments,
            isAvailable: appointments.length < 8 
          };
        })
      );
      
      res.json({
        success: true,
        doctors: doctorsWithAvailability
      });
    } else {
      const formattedDoctors = doctors.map(doctor => ({
        id: doctor.id,
        firstName: doctor.first_name,
        lastName: doctor.last_name,
        email: doctor.email,
        phone: doctor.phone,
        doctorId: doctor.employee_id,
        specialization: doctor.specialization,
        appointments: [],
        isAvailable: true
      }));

      res.json({
        success: true,
        doctors: formattedDoctors
      });
    }
  } catch (error) {
    console.error('Error fetching available doctors:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching available doctors', 
      error: error.message 
    });
  }
};

// ADD THIS MISSING FUNCTION
exports.getAllDoctors = async (req, res) => {
  try {
    const doctors = await User.findAll({
      where: { role: 'doctor', is_active: true },
      attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'employee_id', 'specialization', 'department']
    });

    const formattedDoctors = doctors.map(doctor => ({
      id: doctor.id,
      firstName: doctor.first_name,
      lastName: doctor.last_name,
      email: doctor.email,
      phone: doctor.phone,
      doctorId: doctor.employee_id,
      specialization: doctor.specialization,
      department: doctor.department
    }));

    res.json({
      success: true,
      doctors: formattedDoctors,
      total: formattedDoctors.length
    });
  } catch (error) {
    console.error('Error fetching all doctors:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching doctors',
      error: error.message 
    });
  }
};

// Billing Management
exports.getAllBilling = async (req, res) => {
  try {
    const { status, patientId, dateFrom, dateTo } = req.query;
    
    const whereClause = {};
    
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    
    if (patientId) {
      // Convert PAT000123 to numeric ID if needed
      let numericPatientId = patientId;
      if (typeof patientId === 'string' && patientId.startsWith('PAT')) {
        const numericId = patientId.replace('PAT', '').replace(/^0+/, '');
        numericPatientId = parseInt(numericId, 10);
      }
      whereClause.patientId = numericPatientId;
    }
    
    if (dateFrom || dateTo) {
      whereClause.date = {};
      if (dateFrom) whereClause.date[Op.gte] = new Date(dateFrom);
      if (dateTo) whereClause.date[Op.lte] = new Date(dateTo);
    }
    
    const billingRecords = await Billing.findAll({
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
      order: [['date', 'DESC'], ['createdAt', 'DESC']]
    });

    const formattedBilling = billingRecords.map(bill => ({
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
      amount: bill.amount,
      status: bill.status,
      invoiceNumber: bill.invoiceNumber,
      date: bill.date,
      dueDate: bill.dueDate,
      createdAt: bill.createdAt
    }));
    
    // Calculate billing overview
    const totalAmount = formattedBilling.reduce((sum, bill) => sum + parseFloat(bill.amount || 0), 0);
    const paidAmount = formattedBilling
      .filter(bill => bill.status === 'paid')
      .reduce((sum, bill) => sum + parseFloat(bill.amount || 0), 0);
    const pendingAmount = formattedBilling
      .filter(bill => bill.status === 'pending')
      .reduce((sum, bill) => sum + parseFloat(bill.amount || 0), 0);

    res.json({
      success: true,
      billing: formattedBilling,
      overview: {
        total: totalAmount,
        paid: paidAmount,
        pending: pendingAmount
      },
      total: formattedBilling.length
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

exports.createBillingForAppointment = async (req, res) => {
  try {
    const { appointmentId, serviceType, amount, description, notes } = req.body;

    if (!appointmentId || !amount) {
      return res.status(400).json({ 
        success: false,
        message: 'Appointment ID and amount are required' 
      });
    }

    const appointment = await Appointment.findByPk(appointmentId, {
      include: [
        { model: User, as: 'patient', attributes: ['id', 'first_name', 'last_name', 'email', 'employee_id'] },
        { model: User, as: 'doctor', attributes: ['id', 'first_name', 'last_name', 'employee_id'] }
      ]
    });

    if (!appointment) {
      return res.status(404).json({ 
        success: false,
        message: 'Appointment not found' 
      });
    }

    const invoiceNumber = `INV-${Date.now()}-${appointment.patientId}`;

    const billing = await Billing.create({
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      appointmentId: appointmentId,
      serviceType: serviceType || 'consultation',
      description: description || `${serviceType || 'Medical consultation'} with Dr. ${appointment.doctor?.first_name} ${appointment.doctor?.last_name}`,
      amount: parseFloat(amount),
      date: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 
      status: 'pending',
      invoiceNumber,
      processedBy: req.user.id,
      notes: notes
    });

    await appointment.update({ 
      status: 'completed',
      billing_created_at: new Date(),
      billing_created_by: req.user.id
    });

    if (appointment.patient?.email) {
      try {
        await sendEmail({
          to: appointment.patient.email,
          subject: 'Medical Bill Generated',
          text: `A bill of $${amount} has been generated for your recent appointment. Invoice #${invoiceNumber}`,
          html: `
            <h3>Medical Bill Generated</h3>
            <p>A bill has been generated for your recent medical appointment.</p>
            <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
            <p><strong>Service:</strong> ${description || serviceType}</p>
            <p><strong>Amount:</strong> $${amount}</p>
            <p><strong>Due Date:</strong> ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
            <p><strong>Doctor:</strong> Dr. ${appointment.doctor?.first_name} ${appointment.doctor?.last_name}</p>
            <p>Please visit our reception desk or patient portal to make payment.</p>
          `
        });
      } catch (emailError) {
        console.error('Failed to send billing notification:', emailError);
      }
    }

    res.json({ 
      success: true,
      message: 'Billing created successfully',
      billing
    });
  } catch (error) {
    console.error('Error creating billing:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error creating billing',
      error: error.message 
    });
  }
};

// Create comprehensive billing with consultation, diagnosis, and lab test fees
exports.createComprehensiveBilling = async (req, res) => {
  try {
    const { 
      patientId, 
      doctorId,
      appointmentId,
      consultationFee = 0,
      diagnosisFee = 0,
      labTestFee = 0,
      consultationDescription,
      diagnosisDescription,
      labTestDescription,
      notes 
    } = req.body;

    if (!patientId) {
      return res.status(400).json({ 
        success: false,
        message: 'Patient ID is required' 
      });
    }

    // Convert PAT000123 to numeric ID if needed
    let numericPatientId = patientId;
    if (typeof patientId === 'string' && patientId.startsWith('PAT')) {
      const numericId = patientId.replace('PAT', '').replace(/^0+/, '');
      numericPatientId = parseInt(numericId, 10);
    }

    // Verify patient exists
    const patient = await User.findByPk(numericPatientId);
    if (!patient || patient.role !== 'patient') {
      return res.status(404).json({ 
        success: false,
        message: 'Patient not found' 
      });
    }

    // Convert doctor ID if needed
    let numericDoctorId = doctorId;
    if (doctorId && typeof doctorId === 'string' && doctorId.startsWith('DOC')) {
      const numericId = doctorId.replace('DOC', '').replace(/^0+/, '');
      numericDoctorId = parseInt(numericId, 10);
    }

    // Verify doctor exists if provided
    if (numericDoctorId) {
      const doctor = await User.findByPk(numericDoctorId);
      if (!doctor || doctor.role !== 'doctor') {
        return res.status(404).json({ 
          success: false,
          message: 'Doctor not found' 
        });
      }
    }

    const invoiceNumber = `INV-${Date.now()}-${numericPatientId}`;
    const totalAmount = parseFloat(consultationFee) + parseFloat(diagnosisFee) + parseFloat(labTestFee);

    if (totalAmount <= 0) {
      return res.status(400).json({ 
        success: false,
        message: 'At least one billing component must have a value greater than 0' 
      });
    }

    const billing = await Billing.create({
      patientId: numericPatientId,
      doctorId: numericDoctorId || null,
      appointmentId: appointmentId || null,
      consultationFee: parseFloat(consultationFee),
      diagnosisFee: parseFloat(diagnosisFee),
      labTestFee: parseFloat(labTestFee),
      consultationDescription,
      diagnosisDescription,
      labTestDescription,
      serviceType: 'comprehensive_billing',
      description: `Comprehensive billing: Consultation ($${consultationFee}), Diagnosis ($${diagnosisFee}), Lab Tests ($${labTestFee})`,
      amount: totalAmount,
      date: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'pending',
      invoiceNumber,
      processedBy: req.user.id,
      notes
    });

    // Send email notification if patient has email
    if (patient.email) {
      try {
        await sendEmail({
          to: patient.email,
          subject: 'Medical Bill Generated',
          text: `A comprehensive medical bill of $${totalAmount} has been generated. Invoice #${invoiceNumber}`,
          html: `
            <h3>Medical Bill Generated</h3>
            <p>A comprehensive medical bill has been generated for your recent visit.</p>
            <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
            <p><strong>Consultation Fee:</strong> $${consultationFee}</p>
            <p><strong>Diagnosis Fee:</strong> $${diagnosisFee}</p>
            <p><strong>Lab Test Fee:</strong> $${labTestFee}</p>
            <p><strong>Total Amount:</strong> $${totalAmount}</p>
            <p><strong>Due Date:</strong> ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
            <p>Please visit our reception desk to make payment.</p>
          `
        });
      } catch (emailError) {
        console.error('Failed to send billing notification:', emailError);
      }
    }

    res.json({ 
      success: true,
      message: 'Comprehensive billing created successfully',
      billing
    });
  } catch (error) {
    console.error('Error creating comprehensive billing:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error creating comprehensive billing',
      error: error.message 
    });
  }
};

exports.updatePaymentStatus = async (req, res) => {
  try {
    const { billingId } = req.params;
    const { 
      status, 
      paidAmount, 
      paymentMethod, 
      notes 
    } = req.body;
    
    const billing = await Billing.findByPk(billingId, {
      include: [
        { model: User, as: 'patient', attributes: ['id', 'first_name', 'last_name', 'email', 'employee_id'] }
      ]
    });
    
    if (!billing) {
      return res.status(404).json({ 
        success: false,
        message: 'Billing record not found' 
      });
    }
    
    const validStatuses = ['pending', 'paid', 'partial', 'overdue'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid payment status' 
      });
    }
    
    const paymentDate = (status === 'paid' || status === 'partial') ? new Date() : null;
    
    await billing.update({
      status,
      paidAmount: paidAmount || billing.paidAmount,
      paymentMethod: paymentMethod || billing.paymentMethod,
      paymentDate,
      processedBy: req.user.id,
      notes: notes || billing.notes
    });
    
    if (status === 'paid' && billing.patient?.email) {
      try {
        await sendEmail({
          to: billing.patient.email,
          subject: 'Payment Confirmation',
          text: `Your payment of $${paidAmount || billing.amount} has been processed successfully.`,
          html: `
            <h3>Payment Confirmation</h3>
            <p>Your payment has been processed successfully.</p>
            <p><strong>Amount Paid:</strong> $${paidAmount || billing.amount}</p>
            <p><strong>Payment Method:</strong> ${paymentMethod || 'Cash'}</p>
            <p><strong>Service:</strong> ${billing.description || billing.serviceType}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p>Thank you for your payment!</p>
          `
        });
      } catch (emailError) {
        console.error('Failed to send payment confirmation:', emailError);
      }
    }
    
    const updatedBilling = await Billing.findByPk(billingId, {
      include: [
        { model: User, as: 'patient', attributes: ['id', 'first_name', 'last_name', 'employee_id'] },
        { model: User, as: 'doctor', attributes: ['id', 'first_name', 'last_name', 'employee_id'] }
      ]
    });
    
    res.json({
      success: true,
      message: 'Payment status updated successfully',
      billing: updatedBilling
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating payment status',
      error: error.message 
    });
  }
};

// Mark billing as paid (for reception use)
exports.markAsPaid = async (req, res) => {
  try {
    const { billingId } = req.params;
    const { paymentMethod = 'cash', notes } = req.body;
    
    const billing = await Billing.findByPk(billingId, {
      include: [
        { model: User, as: 'patient', attributes: ['id', 'first_name', 'last_name', 'email', 'employee_id'] }
      ]
    });
    
    if (!billing) {
      return res.status(404).json({ 
        success: false,
        message: 'Billing record not found' 
      });
    }
    
    if (billing.status === 'paid') {
      return res.status(400).json({ 
        success: false,
        message: 'Bill is already marked as paid' 
      });
    }
    
    await billing.update({
      status: 'paid',
      paidAmount: billing.amount,
      paymentMethod,
      paymentDate: new Date(),
      processedBy: req.user.id,
      notes: notes || billing.notes
    });
    
    // Send payment confirmation email
    if (billing.patient?.email) {
      try {
        await sendEmail({
          to: billing.patient.email,
          subject: 'Payment Confirmation - Thank You',
          text: `Your payment of $${billing.amount} has been received successfully.`,
          html: `
            <h3>Payment Confirmation</h3>
            <p>Dear ${billing.patient.first_name || 'Patient'},</p>
            <p>Your payment has been received and processed successfully.</p>
            <p><strong>Invoice Number:</strong> ${billing.invoiceNumber}</p>
            <p><strong>Amount Paid:</strong> $${billing.amount}</p>
            <p><strong>Payment Method:</strong> ${paymentMethod}</p>
            <p><strong>Payment Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p>Thank you for your payment!</p>
          `
        });
      } catch (emailError) {
        console.error('Failed to send payment confirmation:', emailError);
      }
    }
    
    const updatedBilling = await Billing.findByPk(billingId, {
      include: [
        { model: User, as: 'patient', attributes: ['id', 'first_name', 'last_name', 'employee_id'] }
      ]
    });
    
    res.json({
      success: true,
      message: 'Payment marked as received successfully',
      billing: updatedBilling
    });
  } catch (error) {
    console.error('Error marking payment as received:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error processing payment',
      error: error.message 
    });
  }
};

// ADD THESE MISSING DASHBOARD FUNCTIONS:

// Dashboard Statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's appointments
    const todaysAppointments = await Appointment.count({
      where: {
        appointmentDate: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        },
        status: { [Op.in]: ['scheduled', 'confirmed', 'waiting', 'in_progress'] }
      }
    });

    // Total patients
    const totalPatients = await User.count({
      where: { role: 'patient' }
    });

    // Today's checked-in patients
    const todaysCheckedIn = await Appointment.count({
      where: {
        appointmentDate: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        },
        status: 'checked_in'
      }
    });

    // Pending billing
    const pendingBilling = await Billing.sum('amount', {
      where: { status: 'pending' }
    });

    // Current queue (appointments waiting or in progress)
    const currentQueue = await Appointment.count({
      where: { 
        status: { [Op.in]: ['waiting', 'in_progress'] } 
      }
    });

    res.json({
      success: true,
      stats: {
        todaysAppointments,
        totalPatients,
        todaysCheckedIn,
        pendingBilling: pendingBilling || 0,
        currentQueue
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

exports.getTodayAppointments = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await Appointment.findAll({
      where: {
        appointmentDate: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        },
        status: { [Op.in]: ['scheduled', 'confirmed', 'waiting', 'in_progress'] }
      },
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
      order: [['appointmentDate', 'ASC'], ['startTime', 'ASC']],
    });

    const formattedAppointments = appointments.map(apt => ({
      id: apt.id,
      patient: apt.patient ? {
        id: apt.patient.id,
        firstName: apt.patient.first_name,
        lastName: apt.patient.last_name,
        email: apt.patient.email,
        phone: apt.patient.phone,
        patientId: apt.patient.employee_id
      } : null,
      doctor: apt.doctor ? {
        id: apt.doctor.id,
        firstName: apt.doctor.first_name,
        lastName: apt.doctor.last_name,
        doctorId: apt.doctor.employee_id
      } : null,
      appointmentDate: apt.appointmentDate,
      appointmentTime: apt.startTime,
      status: apt.status,
      type: apt.visitType,
      reason: apt.notes
    }));

    res.json({
      success: true,
      appointments: formattedAppointments
    });
  } catch (error) {
    console.error('Error fetching today appointments:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching today appointments',
      error: error.message 
    });
  }
};

// Appointment Requests (placeholder implementations)
exports.getAppointmentRequests = async (req, res) => {
  try {
    // This would typically fetch appointment requests from a separate collection
    res.json({
      success: true,
      requests: []
    });
  } catch (error) {
    console.error('Error fetching appointment requests:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching appointment requests',
      error: error.message 
    });
  }
};

exports.processAppointmentRequest = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Appointment request processed successfully'
    });
  } catch (error) {
    console.error('Error processing appointment request:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error processing appointment request',
      error: error.message 
    });
  }
};

// Helper function to calculate end time
function calculateEndTime(startTime, duration = 30) {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + duration;
  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
}