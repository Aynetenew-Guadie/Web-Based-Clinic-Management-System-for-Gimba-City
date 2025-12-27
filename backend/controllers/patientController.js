const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const Patient = require('../models/patient'); // Add Patient model if you have one
const Appointment = require('../models/appointment');
const AppointmentRequest = require('../models/appointmentRequest');
const MedicalRecord = require('../models/medicalRecord');
const Prescription = require('../models/prescription');
const LabResult = require('../models/labResult');
const Billing = require('../models/billing');
const LabRequest = require('../models/labRequest'); // Add this import
const { sendEmail } = require('../utils/emailService');

// Get patient profile with enhanced information
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { 
        exclude: ['password'] // Always exclude password
      },
      include: [
        {
          model: Patient,
          as: 'patientProfile',
          required: false
        }
      ]
    });
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

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

    const roleSpecificId = generateRoleId(user.role, user.id);

    // Combine user and patient profile data
    const profileData = {
      ...user.toJSON(),
      roleSpecificId,
      patientId: user.role === 'patient' ? roleSpecificId : undefined,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username
    };

    // Merge with patient profile if exists
    if (user.patientProfile) {
      Object.assign(profileData, user.patientProfile.toJSON());
    }

    res.json({
      success: true,
      data: profileData
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching profile',
      error: error.message 
    });
  }
};

// Update patient profile
exports.updateProfile = async (req, res) => {
  try {
    const { 
      email, 
      first_name, 
      last_name, 
      phone, 
      date_of_birth, 
      gender, 
      address, 
      emergency_contact, 
      insurance_provider,
      blood_type,
      allergies,
      medical_conditions
    } = req.body;
    
    const updateData = {};
    if (email) updateData.email = email;
    if (first_name) updateData.first_name = first_name;
    if (last_name) updateData.last_name = last_name;
    if (phone) updateData.phone = phone;
    if (date_of_birth) updateData.date_of_birth = date_of_birth;
    if (gender) updateData.gender = gender;
    if (address) updateData.address = address;
    if (emergency_contact) updateData.emergency_contact = emergency_contact;
    if (insurance_provider) updateData.insurance_provider = insurance_provider;
    if (blood_type) updateData.blood_type = blood_type;
    if (allergies) updateData.allergies = allergies;
    if (medical_conditions) updateData.medical_conditions = medical_conditions;
    
    await User.update(updateData, { 
      where: { id: req.user.id } 
    });
    
    const updatedUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
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

    const roleSpecificId = generateRoleId(updatedUser.role, updatedUser.id);
    
    res.json({ 
      success: true,
      message: 'Profile updated successfully',
      data: {
        ...updatedUser.toJSON(),
        roleSpecificId,
        patientId: updatedUser.role === 'patient' ? roleSpecificId : undefined,
        name: `${updatedUser.first_name || ''} ${updatedUser.last_name || ''}`.trim() || updatedUser.username
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating profile',
      error: error.message 
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await User.update(
      { password: hashedPassword },
      { where: { id: req.user.id } }
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: error.message
    });
  }
};

// Get patient appointments with enhanced data
exports.getAppointments = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { patientId: req.user.id };
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    const { count, rows: appointments } = await Appointment.findAndCountAll({
      where: whereClause,
      include: [
        { 
          model: User, 
          as: 'doctor', 
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'specialization'] 
        }
      ],
      order: [['appointmentDate', 'DESC'], ['startTime', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        appointments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalAppointments: count,
          hasNext: page < Math.ceil(count / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching appointments',
      error: error.message 
    });
  }
};

// Get single appointment details
exports.getAppointmentDetails = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findOne({
      where: { 
        id: appointmentId,
        patientId: req.user.id 
      },
      include: [
        { 
          model: User, 
          as: 'doctor', 
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'specialization', 'qualifications'] 
        }
      ]
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    res.json({
      success: true,
      data: appointment
    });
  } catch (error) {
    console.error('Error fetching appointment details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching appointment details',
      error: error.message
    });
  }
};

// Request new appointment
exports.requestAppointment = async (req, res) => {
  try {
    const {
      preferredDate,
      preferredTimeSlot,
      visitType,
      urgency,
      symptoms,
      preferredDoctorId,
      notes
    } = req.body;

    if (!preferredDate || !preferredTimeSlot || !visitType) {
      return res.status(400).json({ 
        success: false,
        message: 'Preferred date, time slot, and visit type are required' 
      });
    }

    const requestDate = new Date(preferredDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (requestDate < today) {
      return res.status(400).json({ 
        success: false,
        message: 'Preferred date must be in the future' 
      });
    }

    const appointmentRequest = await AppointmentRequest.create({
      patient_id: req.user.id,
      preferred_date: preferredDate,
      preferred_time_slot: preferredTimeSlot,
      visit_type: visitType,
      urgency: urgency || 'normal',
      symptoms: symptoms || '',
      preferred_doctor_id: preferredDoctorId || null,
      notes: notes || '',
      status: 'pending'
    });

    // Send notification to receptionists
    try {
      const receptionists = await User.findAll({
        where: { role: 'receptionist' },
        attributes: ['email', 'first_name', 'last_name']
      });

      const patient = await User.findByPk(req.user.id, {
        attributes: ['first_name', 'last_name', 'username']
      });

      const patientName = patient ? `${patient.first_name} ${patient.last_name}`.trim() || patient.username : 'Patient';

      for (const receptionist of receptionists) {
        if (receptionist.email) {
          await sendEmail({
            to: receptionist.email,
            subject: 'New Appointment Request - Patient Portal',
            text: `A new appointment request has been submitted by ${patientName}. Please review and schedule accordingly.`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">New Appointment Request</h2>
                <p>A new appointment request has been submitted through the patient portal.</p>
                
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
                  <h3 style="margin-top: 0; color: #374151;">Request Details</h3>
                  <p><strong>Patient:</strong> ${patientName}</p>
                  <p><strong>Preferred Date:</strong> ${new Date(preferredDate).toLocaleDateString()}</p>
                  <p><strong>Time Slot:</strong> ${preferredTimeSlot}</p>
                  <p><strong>Visit Type:</strong> ${visitType}</p>
                  <p><strong>Urgency:</strong> ${urgency || 'normal'}</p>
                  ${symptoms ? `<p><strong>Symptoms:</strong> ${symptoms}</p>` : ''}
                  ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
                </div>
                
                <p>Please log in to the receptionist portal to review and schedule this appointment.</p>
                
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                  <p style="color: #6b7280; font-size: 14px;">
                    This is an automated notification from the Patient Portal System.
                  </p>
                </div>
              </div>
            `
          });
        }
      }
    } catch (emailError) {
      console.error('Failed to send notification emails:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Appointment request submitted successfully',
      data: appointmentRequest
    });
  } catch (error) {
    console.error('Error requesting appointment:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error submitting appointment request',
      error: error.message 
    });
  }
};

// Get appointment requests
exports.getAppointmentRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { patient_id: req.user.id };
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    const { count, rows: requests } = await AppointmentRequest.findAndCountAll({
      where: whereClause,
      include: [
        { 
          model: User, 
          as: 'preferredDoctor', 
          attributes: ['id', 'first_name', 'last_name', 'specialization'] 
        },
        { 
          model: User, 
          as: 'receptionist', 
          attributes: ['id', 'first_name', 'last_name'] 
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        appointmentRequests: requests,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalRequests: count,
          hasNext: page < Math.ceil(count / limit),
          hasPrev: page > 1
        }
      }
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

// Cancel appointment request
exports.cancelAppointmentRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const request = await AppointmentRequest.findOne({
      where: { 
        id: requestId, 
        patient_id: req.user.id,
        status: 'pending'
      }
    });

    if (!request) {
      return res.status(404).json({ 
        success: false,
        message: 'Appointment request not found or cannot be cancelled' 
      });
    }

    await request.update({ status: 'cancelled' });

    res.json({ 
      success: true,
      message: 'Appointment request cancelled successfully',
      data: request
    });
  } catch (error) {
    console.error('Error cancelling appointment request:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error cancelling appointment request',
      error: error.message 
    });
  }
};

// Cancel appointment
exports.cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { cancellationReason } = req.body;

    const appointment = await Appointment.findOne({
      where: {
        id: appointmentId,
        patientId: req.user.id
      },
      include: [
        { 
          model: User, 
          as: 'doctor', 
          attributes: ['id', 'first_name', 'last_name', 'email'] 
        }
      ]
    });

    if (!appointment) {
      return res.status(404).json({ 
        success: false,
        message: 'Appointment not found or unauthorized' 
      });
    }

    if (appointment.status === 'completed' || appointment.status === 'cancelled') {
      return res.status(400).json({ 
        success: false,
        message: `Cannot cancel appointment that is already ${appointment.status}` 
      });
    }

    await appointment.update({ 
      status: 'cancelled',
      cancellation_reason: cancellationReason || 'Patient requested cancellation',
      cancelled_at: new Date()
    });

    // Notify doctor
    if (appointment.doctor && appointment.doctor.email) {
      try {
        const patient = await User.findByPk(req.user.id, {
          attributes: ['first_name', 'last_name', 'username']
        });

        const patientName = patient ? `${patient.first_name} ${patient.last_name}`.trim() || patient.username : 'Patient';

        await sendEmail({
          to: appointment.doctor.email,
          subject: 'Appointment Cancelled by Patient',
          text: `Patient ${patientName} has cancelled their appointment scheduled for ${appointment.appointmentDate}.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">Appointment Cancelled</h2>
              <p>Patient <strong>${patientName}</strong> has cancelled their appointment.</p>
              
              <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <h3 style="margin-top: 0; color: #374151;">Cancelled Appointment Details</h3>
                <p><strong>Date:</strong> ${new Date(appointment.appointmentDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${appointment.startTime} - ${appointment.endTime}</p>
                <p><strong>Visit Type:</strong> ${appointment.visitType}</p>
                ${cancellationReason ? `<p><strong>Cancellation Reason:</strong> ${cancellationReason}</p>` : ''}
              </div>
              
              <p>This time slot is now available for other patients.</p>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Failed to send cancellation notification:', emailError);
      }
    }

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: appointment
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error cancelling appointment',
      error: error.message 
    });
  }
};

// Reschedule appointment
exports.rescheduleAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { preferredDate, preferredTimeSlot, reason } = req.body;

    if (!preferredDate || !preferredTimeSlot) {
      return res.status(400).json({ 
        success: false,
        message: 'Preferred date and time slot are required' 
      });
    }

    const appointment = await Appointment.findOne({
      where: {
        id: appointmentId,
        patientId: req.user.id
      },
      include: [
        { 
          model: User, 
          as: 'doctor', 
          attributes: ['id', 'first_name', 'last_name', 'email'] 
        }
      ]
    });

    if (!appointment) {
      return res.status(404).json({ 
        success: false,
        message: 'Appointment not found or unauthorized' 
      });
    }

    if (appointment.status === 'completed' || appointment.status === 'cancelled') {
      return res.status(400).json({ 
        success: false,
        message: `Cannot reschedule appointment that is already ${appointment.status}` 
      });
    }

    const requestDate = new Date(preferredDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (requestDate < today) {
      return res.status(400).json({ 
        success: false,
        message: 'Preferred date must be in the future' 
      });
    }

    // Create reschedule request
    const rescheduleRequest = await AppointmentRequest.create({
      patient_id: req.user.id,
      preferred_date: preferredDate,
      preferred_time_slot: preferredTimeSlot,
      visit_type: appointment.visitType,
      urgency: 'normal',
      preferred_doctor_id: appointment.doctorId,
      notes: `Reschedule request for appointment #${appointmentId}. ${reason ? 'Reason: ' + reason : ''}`,
      status: 'pending',
      original_appointment_id: appointmentId,
      is_reschedule_request: true
    });

    // Notify receptionists and doctor
    try {
      const recipients = [];
   
      if (appointment.doctor && appointment.doctor.email) {
        recipients.push(appointment.doctor.email);
      }

      const receptionists = await User.findAll({
        where: { role: 'receptionist' },
        attributes: ['email']
      });
      
      recipients.push(...receptionists.map(r => r.email).filter(Boolean));

      const patient = await User.findByPk(req.user.id, {
        attributes: ['first_name', 'last_name', 'username']
      });

      const patientName = patient ? `${patient.first_name} ${patient.last_name}`.trim() || patient.username : 'Patient';

      for (const email of recipients) {
        await sendEmail({
          to: email,
          subject: 'Appointment Reschedule Request - Patient Portal',
          text: `Patient ${patientName} has requested to reschedule their appointment.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #d97706;">Appointment Reschedule Request</h2>
              <p>Patient <strong>${patientName}</strong> has requested to reschedule their appointment.</p>
              
              <div style="background: #fffbeb; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <h3 style="margin-top: 0; color: #374151;">Current Appointment</h3>
                <p><strong>Date:</strong> ${new Date(appointment.appointmentDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${appointment.startTime} - ${appointment.endTime}</p>
                <p><strong>Visit Type:</strong> ${appointment.visitType}</p>
                
                <h3 style="color: #374151; margin-top: 20px;">Requested New Schedule</h3>
                <p><strong>Date:</strong> ${new Date(preferredDate).toLocaleDateString()}</p>
                <p><strong>Time Slot:</strong> ${preferredTimeSlot}</p>
                ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
              </div>
              
              <p>Please review and process this reschedule request.</p>
            </div>
          `
        });
      }
    } catch (emailError) {
      console.error('Failed to send reschedule notification:', emailError);
    }

    res.json({
      success: true,
      message: 'Reschedule request submitted successfully. You will be notified once it is processed.',
      data: rescheduleRequest
    });
  } catch (error) {
    console.error('Error requesting reschedule:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error submitting reschedule request',
      error: error.message 
    });
  }
};

// Get medical records
exports.getMedicalRecords = async (req, res) => {
  try {
    const { page = 1, limit = 10, record_type } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { patient_id: req.user.id };
    if (record_type && record_type !== 'all') {
      whereClause.record_type = record_type;
    }

    const { count, rows: records } = await MedicalRecord.findAndCountAll({
      where: whereClause,
      include: [
        { 
          model: User, 
          as: 'doctor', 
          attributes: ['id', 'first_name', 'last_name', 'specialization'] 
        },
        { 
          model: Appointment, 
          as: 'appointment', 
          attributes: ['id', 'appointmentDate', 'visitType'] 
        }
      ],
      order: [['record_date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        medicalRecords: records,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalRecords: count,
          hasNext: page < Math.ceil(count / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching medical records:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching medical records',
      error: error.message 
    });
  }
};

// Get prescriptions
exports.getPrescriptions = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { patientId: req.user.id };
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    // Try DB first
    try {
      const { count, rows: prescriptions } = await Prescription.findAndCountAll({
        where: whereClause,
        include: [
          { 
            model: User, 
            as: 'doctor', 
            attributes: ['id', 'first_name', 'last_name', 'specialization'] 
          },
          {
            model: User,
            as: 'dispenser',
            attributes: ['id', 'first_name', 'last_name', 'username']
          }
        ],
        order: [['dateIssued', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      return res.json({
        success: true,
        data: {
          prescriptions,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(count / limit),
            totalPrescriptions: count,
            hasNext: page < Math.ceil(count / limit),
            hasPrev: page > 1
          }
        }
      });
    } catch (dbErr) {
      // Fallback to in-memory list
      console.warn('DB unavailable for patient prescriptions, using in-memory fallback');
      const list = Array.isArray(global.prescriptions) ? global.prescriptions.filter(p => String(p.patientId) === String(req.user.id)) : [];
      const filtered = (status && status !== 'all') ? list.filter(p => p.status === status) : list;
      const count = filtered.length;
      const paged = filtered.slice(offset, offset + parseInt(limit));

      // Enrich with doctor info from global.users if present
      const usersMap = Array.isArray(global.users) ? global.users.reduce((m, u) => { m[u.id] = u; return m; }, {}) : {};
      const enriched = paged.map(p => ({
        ...p,
        doctor: usersMap[p.doctorId] ? { id: usersMap[p.doctorId].id, first_name: usersMap[p.doctorId].first_name || usersMap[p.doctorId].name || usersMap[p.doctorId].username, last_name: usersMap[p.doctorId].last_name } : null
      }));

      return res.json({
        success: true,
        data: {
          prescriptions: enriched,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(count / limit),
            totalPrescriptions: count,
            hasNext: page < Math.ceil(count / limit),
            hasPrev: page > 1
          }
        }
      });
    }
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching prescriptions',
      error: error.message 
    });
  }
};

// Get lab results
exports.getLabResults = async (req, res) => {
  try {
    const { page = 1, limit = 10, test_type } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {
      [Op.or]: [
        { releasedToPatient: true }, 
        { sharedWithPatient: true } 
      ]
    };

    if (test_type && test_type !== 'all') {
      whereClause.test_type = test_type;
    }

    const { count, rows: results } = await LabResult.findAndCountAll({
      where: whereClause,
      include: [
        { 
          model: LabRequest, 
          as: 'labRequest', 
          where: { patientId: req.user.id },
          required: true,
          include: [
            { 
              model: User, 
              as: 'doctor', 
              attributes: ['id', 'first_name', 'last_name', 'specialization'] 
            }
          ]
        },
        { 
          model: User, 
          as: 'technician', 
          attributes: ['id', 'first_name', 'last_name'] 
        },
        { 
          model: User, 
          as: 'releasedByDoctor', 
          attributes: ['id', 'first_name', 'last_name'] 
        }
      ],
      order: [
        ['releasedAt', 'DESC'],
        ['sharedAt', 'DESC']
      ],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const resultsWithStatus = results.map(result => {
      const resultData = result.toJSON();
      
      if (resultData.releasedToPatient) {
        resultData.status = 'released';
        resultData.statusText = 'Released with Diagnosis';
        resultData.statusColor = 'green';
        resultData.availableDate = resultData.releasedAt;
      } else if (resultData.sharedWithPatient) {
        resultData.status = 'shared';
        resultData.statusText = 'Shared by Doctor';
        resultData.statusColor = 'blue';
        resultData.availableDate = resultData.sharedAt;
      }
      
      return resultData;
    });

    res.json({
      success: true,
      data: {
        labResults: resultsWithStatus,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalResults: count,
          hasNext: page < Math.ceil(count / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching lab results:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching lab results',
      error: error.message 
    });
  }
};

// Get billing history
exports.getBillingHistory = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { patientId: req.user.id };
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    const { count, rows: bills } = await Billing.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Appointment,
          as: 'appointment',
          attributes: ['id', 'appointmentDate', 'visitType'],
          include: [
            {
              model: User,
              as: 'doctor',
              attributes: ['id', 'first_name', 'last_name', 'specialization']
            }
          ]
        }
      ],
      order: [['date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Calculate totals
    const totalAmount = await Billing.sum('amount', { where: whereClause });
    const paidAmount = await Billing.sum('amount', { 
      where: { ...whereClause, status: 'paid' } 
    });

    res.json({
      success: true,
      data: {
        billingHistory: bills,
        summary: {
          totalAmount: totalAmount || 0,
          paidAmount: paidAmount || 0,
          pendingAmount: (totalAmount || 0) - (paidAmount || 0)
        },
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalBills: count,
          hasNext: page < Math.ceil(count / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching billing history:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching billing history',
      error: error.message 
    });
  }
};

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));

    // Get appointment counts by status
    const appointmentCounts = await Appointment.findAll({
      where: { patientId: req.user.id },
      attributes: [
        'status',
        [Appointment.sequelize.fn('COUNT', Appointment.sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    const appointmentsByStatus = {};
    let totalAppointments = 0;
    appointmentCounts.forEach(item => {
      appointmentsByStatus[item.status] = parseInt(item.get('count'));
      totalAppointments += parseInt(item.get('count'));
    });

    // ... rest unchanged
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message
    });
  }
};

// Get a single prescription details for the patient
exports.getPrescriptionDetails = async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const prescription = await Prescription.findOne({
      where: { id: prescriptionId, patientId: req.user.id },
      include: [
        { model: User, as: 'doctor', attributes: ['id', 'first_name', 'last_name', 'username'] },
        { model: User, as: 'dispenser', attributes: ['id', 'first_name', 'last_name', 'username'] }
      ]
    });

    if (!prescription) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    res.json({ success: true, data: prescription });
  } catch (error) {
    console.error('Error fetching prescription details:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch prescription' });
  }
};
      where: { patientId: req.user.id },
      attributes: [
        'status',
        [Appointment.sequelize.fn('COUNT', Appointment.sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    const appointmentsByStatus = {};
    let totalAppointments = 0;
    appointmentCounts.forEach(item => {
      appointmentsByStatus[item.status] = parseInt(item.get('count'));
      totalAppointments += parseInt(item.get('count'));
    });

    // Today's appointments
    const todayAppointments = await Appointment.count({
      where: {
        patientId: req.user.id,
        appointmentDate: { [Op.gte]: startOfToday },
        status: { [Op.in]: ['scheduled', 'confirmed'] }
      }
    });

    // Other counts
    const medicalRecordsCount = await MedicalRecord.count({
      where: { patient_id: req.user.id }
    });

    const prescriptionsCount = await Prescription.count({
      where: { patientId: req.user.id }
    });

    const pendingInvoices = await Billing.count({
      where: { 
        patientId: req.user.id, 
        status: 'pending' 
      }
    });

    // Get user info for display
    const user = await User.findByPk(req.user.id, {
      attributes: ['first_name', 'last_name', 'username']
    });

    const generateRoleId = (role, id) => {
      const rolePrefix = {
        'patient': 'PAT',
        'doctor': 'DOC', 
        'lab_technician': 'LAB',
        'receptionist': 'REC',
        'admin': 'ADM'
      };
      return `${rolePrefix[role] || 'USR'}${String(id).padStart(6, '0')}`;
    };

    const patientId = generateRoleId('patient', req.user.id);

    res.json({
      success: true,
      data: {
        appointments: {
          total: totalAppointments,
          byStatus: appointmentsByStatus,
          today: todayAppointments
        },
        medicalRecords: medicalRecordsCount,
        prescriptions: prescriptionsCount,
        pendingInvoices: pendingInvoices,
        patient: {
          name: user ? `${user.first_name} ${user.last_name}`.trim() || user.username : 'Patient',
          patientId: patientId
        }
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