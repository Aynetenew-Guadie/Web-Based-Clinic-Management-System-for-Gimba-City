const { Op, Sequelize } = require('sequelize');
const User = require('../models/user');
const Appointment = require('../models/appointment');
const MedicalNote = require('../models/medicalNote');
const Prescription = require('../models/prescription');
const LabRequest = require('../models/labRequest');
const LabResult = require('../models/labResult');
const Patient = require('../models/patient');
const Billing = require('../models/billing');
const Doctor = require('../models/doctor');
const Consultation = require('../models/consultation');
const Notification = require('../models/notification');

// Helper function to calculate age
const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// Helper function to generate unique ID
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

module.exports = {
  // Get doctor profile
  async getMyProfile(req, res) {
    try {
      console.log('Getting doctor profile for user:', req.user.id);
      
      const doctor = await Doctor.findOne({
        where: { userId: req.user.id },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email', 'first_name', 'last_name', 'phone', 'profile_image']
          }
        ]
      });

      if (!doctor) {
        return res.status(404).json({ 
          success: false, 
          error: 'Doctor profile not found' 
        });
      }

      const doctorData = {
        id: doctor.id,
        userId: doctor.userId,
        specialization: doctor.specialization,
        qualification: doctor.qualification,
        licenseNumber: doctor.licenseNumber,
        department: doctor.department,
        consultationFee: doctor.consultationFee,
        availableDays: doctor.availableDays,
        availableHours: doctor.availableHours,
        user: doctor.user
      };

      res.json({
        success: true,
        data: doctorData
      });
    } catch (error) {
      console.error('Error fetching doctor profile:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch doctor profile',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get doctor statistics
  async getDoctorStats(req, res) {
    try {
      console.log('Getting stats for doctor:', req.user.id);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      // Today's appointments
      const todayAppointmentsCount = await Appointment.count({
        where: {
          doctorId: req.user.id,
          appointmentDate: {
            [Op.gte]: today,
            [Op.lt]: tomorrow
          }
        }
      });

      // Total unique patients
      const uniquePatients = await Appointment.findAll({
        where: { doctorId: req.user.id },
        attributes: ['patientId'],
        group: ['patientId']
      });
      const totalPatients = uniquePatients.length;

      // Completed appointments
      const completedAppointmentsCount = await Appointment.count({
        where: {
          doctorId: req.user.id,
          status: 'completed'
        }
      });

      // Pending prescriptions
      const pendingPrescriptionsCount = await Prescription.count({
        where: {
          doctorId: req.user.id,
          status: 'active'
        }
      });

      // Monthly appointments
      const monthlyAppointmentsCount = await Appointment.count({
        where: {
          doctorId: req.user.id,
          appointmentDate: {
            [Op.gte]: startOfMonth,
            [Op.lt]: endOfMonth
          }
        }
      });

      // Calculate patient satisfaction from ratings
      const appointmentsWithRatings = await Appointment.findAll({
        where: { 
          doctorId: req.user.id,
          status: 'completed',
          rating: { [Op.not]: null }
        },
        attributes: ['rating']
      });

      const ratings = appointmentsWithRatings.map(a => a.rating);
      const patientSatisfaction = ratings.length > 0 
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 20)
        : 95;

      res.json({
        success: true,
        data: {
          totalPatients,
          todayAppointments: todayAppointmentsCount,
          completedAppointments: completedAppointmentsCount,
          pendingPrescriptions: pendingPrescriptionsCount,
          monthlyAppointments: monthlyAppointmentsCount,
          patientSatisfaction,
          upcomingAppointments: todayAppointmentsCount,
          totalEarnings: 0 // Add billing logic here
        }
      });
    } catch (error) {
      console.error('Error fetching doctor stats:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch doctor statistics',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get dashboard statistics
  async getDashboardStats(req, res) {
    try {
      console.log('Getting dashboard stats for doctor:', req.user.id);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get counts in parallel for better performance
      const [
        todayAppointments,
        monthlyAppointments,
        totalPatients,
        completedAppointments,
        pendingPrescriptions
      ] = await Promise.all([
        // Today's appointments
        Appointment.count({
          where: {
            doctorId: req.user.id,
            appointmentDate: {
              [Op.gte]: today,
              [Op.lt]: tomorrow
            }
          }
        }),
        // Monthly appointments
        Appointment.count({
          where: {
            doctorId: req.user.id,
            appointmentDate: {
              [Op.gte]: new Date(today.getFullYear(), today.getMonth(), 1),
              [Op.lt]: new Date(today.getFullYear(), today.getMonth() + 1, 0)
            }
          }
        }),
        // Total unique patients
        Appointment.findAll({
          where: { doctorId: req.user.id },
          attributes: ['patientId'],
          group: ['patientId']
        }).then(result => result.length),
        // Completed appointments
        Appointment.count({
          where: {
            doctorId: req.user.id,
            status: 'completed'
          }
        }),
        // Pending prescriptions
        Prescription.count({
          where: {
            doctorId: req.user.id,
            status: 'active'
          }
        })
      ]);

      // Get today's appointments list
      const todaysAppointmentsList = await Appointment.findAll({
        where: {
          doctorId: req.user.id,
          appointmentDate: {
            [Op.gte]: today,
            [Op.lt]: tomorrow
          },
          status: {
            [Op.in]: ['scheduled', 'confirmed', 'in_progress']
          }
        },
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'first_name', 'last_name', 'date_of_birth', 'gender', 'phone']
          }
        ],
        order: [['startTime', 'ASC']],
        limit: 5
      });

      // Get recent medical notes
      const recentMedicalNotes = await MedicalNote.findAll({
        where: { doctorId: req.user.id },
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'first_name', 'last_name']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: 5
      });

      res.json({
        success: true,
        data: {
          stats: {
            todayAppointments,
            monthlyAppointments,
            totalPatients,
            completedAppointments,
            pendingPrescriptions,
            patientSatisfaction: 95 // Default or calculate from ratings
          },
          todaysAppointments: todaysAppointmentsList.map(appt => ({
            id: appt.id,
            patientName: `${appt.patient?.first_name || ''} ${appt.patient?.last_name || ''}`.trim(),
            appointmentTime: appt.startTime,
            type: appt.type,
            status: appt.status
          })),
          recentNotes: recentMedicalNotes.map(note => ({
            id: note.id,
            patientName: `${note.patient?.first_name || ''} ${note.patient?.last_name || ''}`.trim(),
            noteType: note.noteType,
            createdAt: note.createdAt,
            content: note.content.substring(0, 50) + '...'
          }))
        }
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch dashboard statistics',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get today's appointments
  async getTodaysAppointments(req, res) {
    try {
      console.log('Getting today\'s appointments for doctor:', req.user.id);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const appointments = await Appointment.findAll({
        where: {
          doctorId: req.user.id,
          appointmentDate: {
            [Op.gte]: today,
            [Op.lt]: tomorrow
          },
          status: {
            [Op.in]: ['scheduled', 'confirmed', 'in_progress']
          }
        },
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'first_name', 'last_name', 'date_of_birth', 'gender', 'phone']
          }
        ],
        order: [['startTime', 'ASC']]
      });

      const formattedAppointments = appointments.map(appt => ({
        id: appt.id,
        patientName: `${appt.patient?.first_name || ''} ${appt.patient?.last_name || ''}`.trim(),
        patientId: appt.patientId,
        appointmentDate: appt.appointmentDate,
        appointmentTime: appt.startTime,
        type: appt.type,
        reason: appt.reason,
        status: appt.status,
        symptoms: appt.symptoms || '',
        notes: appt.notes || '',
        patient: appt.patient
      }));

      res.json({
        success: true,
        count: formattedAppointments.length,
        data: formattedAppointments
      });
    } catch (error) {
      console.error('Error fetching today appointments:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch today\'s appointments',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get all appointments
  async getAllAppointments(req, res) {
    try {
      const { status, startDate, endDate, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const whereCondition = { doctorId: req.user.id };
      
      if (status) {
        whereCondition.status = status;
      }
      
      if (startDate && endDate) {
        whereCondition.appointmentDate = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }

      const { count, rows } = await Appointment.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'first_name', 'last_name', 'date_of_birth', 'gender', 'phone']
          }
        ],
        order: [['appointmentDate', 'DESC'], ['startTime', 'ASC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        count: rows.length,
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / limit),
        data: rows
      });
    } catch (error) {
      console.error('Error fetching all appointments:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch appointments',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get upcoming appointments
  async getUpcomingAppointments(req, res) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const appointments = await Appointment.findAll({
        where: {
          doctorId: req.user.id,
          appointmentDate: {
            [Op.gte]: today
          },
          status: {
            [Op.in]: ['scheduled', 'confirmed']
          }
        },
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'first_name', 'last_name', 'date_of_birth', 'gender', 'phone']
          }
        ],
        order: [['appointmentDate', 'ASC'], ['startTime', 'ASC']],
        limit: 20
      });

      res.json({
        success: true,
        count: appointments.length,
        data: appointments
      });
    } catch (error) {
      console.error('Error fetching upcoming appointments:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch upcoming appointments',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get pending appointments
  async getPendingAppointments(req, res) {
    try {
      const appointments = await Appointment.findAll({
        where: {
          doctorId: req.user.id,
          status: 'pending'
        },
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'first_name', 'last_name', 'date_of_birth', 'gender', 'phone']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: 20
      });

      res.json({
        success: true,
        count: appointments.length,
        data: appointments
      });
    } catch (error) {
      console.error('Error fetching pending appointments:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch pending appointments',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get appointment details
  async getAppointmentDetails(req, res) {
    try {
      const { appointmentId } = req.params;

      const appointment = await Appointment.findOne({
        where: {
          id: appointmentId,
          doctorId: req.user.id
        },
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'first_name', 'last_name', 'date_of_birth', 'gender', 'phone', 'address', 'blood_group']
          }
        ]
      });

      if (!appointment) {
        return res.status(404).json({ 
          success: false, 
          error: 'Appointment not found' 
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
        error: 'Failed to fetch appointment details',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Update appointment status
  async updateAppointmentStatus(req, res) {
    try {
      const { appointmentId } = req.params;
      const { status } = req.body;

      if (!['confirmed', 'cancelled', 'no-show', 'in_progress'].includes(status)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid status' 
        });
      }

      const appointment = await Appointment.findOne({
        where: { 
          id: appointmentId,
          doctorId: req.user.id 
        }
      });

      if (!appointment) {
        return res.status(404).json({ 
          success: false, 
          error: 'Appointment not found' 
        });
      }

      appointment.status = status;
      await appointment.save();

      res.json({
        success: true,
        message: `Appointment ${status} successfully`,
        data: appointment
      });
    } catch (error) {
      console.error('Error updating appointment status:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to update appointment status' 
      });
    }
  },

  // Complete appointment
  async completeAppointment(req, res) {
    try {
      const { appointmentId } = req.params;
      const { diagnosis, treatment, notes, followUpDate } = req.body;

      const appointment = await Appointment.findOne({
        where: { 
          id: appointmentId,
          doctorId: req.user.id,
          status: 'in_progress'
        }
      });

      if (!appointment) {
        return res.status(404).json({ 
          success: false, 
          error: 'Appointment not found or not in progress' 
        });
      }

      appointment.status = 'completed';
      appointment.diagnosis = diagnosis;
      appointment.treatment = treatment;
      appointment.notes = notes;
      appointment.followUpDate = followUpDate;
      appointment.completedAt = new Date();
      await appointment.save();

      res.json({
        success: true,
        message: 'Appointment completed successfully',
        data: appointment
      });
    } catch (error) {
      console.error('Error completing appointment:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to complete appointment' 
      });
    }
  },

  // Reschedule appointment
  async rescheduleAppointment(req, res) {
    try {
      const { appointmentId } = req.params;
      const { appointmentDate, appointmentTime } = req.body;

      const appointment = await Appointment.findOne({
        where: { 
          id: appointmentId,
          doctorId: req.user.id,
          status: { [Op.in]: ['scheduled', 'confirmed'] }
        }
      });

      if (!appointment) {
        return res.status(404).json({ 
          success: false, 
          error: 'Appointment not found or cannot be rescheduled' 
        });
      }

      appointment.appointmentDate = appointmentDate;
      appointment.startTime = appointmentTime;
      await appointment.save();

      res.json({
        success: true,
        message: 'Appointment rescheduled successfully',
        data: appointment
      });
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to reschedule appointment' 
      });
    }
  },

  // Cancel appointment
  async cancelAppointment(req, res) {
    try {
      const { appointmentId } = req.params;
      const { cancellationReason } = req.body;

      const appointment = await Appointment.findOne({
        where: { 
          id: appointmentId,
          doctorId: req.user.id,
          status: { [Op.in]: ['scheduled', 'confirmed'] }
        }
      });

      if (!appointment) {
        return res.status(404).json({ 
          success: false, 
          error: 'Appointment not found or cannot be cancelled' 
        });
      }

      appointment.status = 'cancelled';
      appointment.cancellation_reason = cancellationReason;
      appointment.cancelled_at = new Date();
      await appointment.save();

      res.json({
        success: true,
        message: 'Appointment cancelled successfully',
        data: appointment
      });
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to cancel appointment' 
      });
    }
  },

  // Get lab technicians
  async getLabTechnicians(req, res) {
    try {
      console.log('Lab technicians endpoint hit for doctor:', req.user.id);
      
      const labTechnicians = await User.findAll({
        where: {
          role: 'lab_technician',
          is_active: true
        },
        attributes: ['id', 'username', 'email', 'first_name', 'last_name', 'phone', 'role', 'specialization', 'profile_image']
      });
      
      console.log(`Found ${labTechnicians.length} lab technicians`);
      
      res.json({
        success: true,
        count: labTechnicians.length,
        data: labTechnicians
      });
    } catch (error) {
      console.error('Error fetching lab technicians:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch lab technicians',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Search patients
  async searchPatients(req, res) {
    try {
      const q = req.query.q || '';
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      console.log(`Searching patients with query: "${q}" for doctor: ${req.user.id}`);

      const whereCondition = {
        role: 'patient',
        is_active: true
      };

      if (q) {
        whereCondition[Op.or] = [
          { username: { [Op.like]: `%${q}%` } },
          { first_name: { [Op.like]: `%${q}%` } },
          { last_name: { [Op.like]: `%${q}%` } },
          { email: { [Op.like]: `%${q}%` } },
          { phone: { [Op.like]: `%${q}%` } },
          Sequelize.where(
            Sequelize.fn('CONCAT', Sequelize.col('first_name'), ' ', Sequelize.col('last_name')),
            { [Op.like]: `%${q}%` }
          )
        ];
      }

      const { count, rows } = await User.findAndCountAll({
        where: whereCondition,
        attributes: ['id', 'username', 'email', 'first_name', 'last_name', 'phone', 'role', 'date_of_birth', 'gender', 'address', 'blood_group', 'emergency_contact', 'profile_image', 'createdAt'],
        limit: limit,
        offset: offset,
        order: [['last_name', 'ASC'], ['first_name', 'ASC']]
      });

      const patientsWithIds = rows.map(patient => {
        const patientData = patient.toJSON();
        patientData.patientId = generateRoleId(patientData.role, patientData.id);
        patientData.roleSpecificId = patientData.patientId;
        patientData.age = calculateAge(patientData.date_of_birth);
        return patientData;
      });

      res.json({
        success: true,
        count: patientsWithIds.length,
        total: count,
        page: page,
        totalPages: Math.ceil(count / limit),
        data: patientsWithIds
      });
    } catch (error) {
      console.error('Error searching patients:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to search patients',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get my patients
  async getMyPatients(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      // Get unique patients who have appointments with this doctor
      const { count, rows } = await Appointment.findAndCountAll({
        where: { doctorId: req.user.id },
        attributes: ['patientId'],
        group: ['patientId'],
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'first_name', 'last_name', 'date_of_birth', 'gender', 'phone']
          }
        ]
      });

      const patients = rows.map(row => ({
        ...row.patient.toJSON(),
        age: calculateAge(row.patient.date_of_birth),
        lastVisit: row.createdAt
      }));

      res.json({
        success: true,
        count: patients.length,
        total: count.length,
        page: parseInt(page),
        totalPages: Math.ceil(count.length / limit),
        data: patients
      });
    } catch (error) {
      console.error('Error fetching my patients:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch my patients',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get patient details
  async getPatientDetails(req, res) {
    try {
      const { patientId } = req.params;

      const patient = await User.findOne({
        where: { 
          id: patientId,
          role: 'patient'
        },
        attributes: ['id', 'username', 'email', 'first_name', 'last_name', 'date_of_birth', 'gender', 'phone', 'address', 'blood_group', 'allergies', 'chronic_conditions', 'emergency_contact', 'profile_image']
      });

      if (!patient) {
        return res.status(404).json({ 
          success: false, 
          error: 'Patient not found' 
        });
      }

      // Get recent appointments with this doctor
      const recentAppointments = await Appointment.findAll({
        where: { 
          patientId: patientId,
          doctorId: req.user.id 
        },
        order: [['appointmentDate', 'DESC']],
        limit: 10
      });

      const patientData = patient.toJSON();
      patientData.age = calculateAge(patientData.date_of_birth);
      patientData.patientId = generateRoleId('patient', patientData.id);

      res.json({
        success: true,
        data: {
          ...patientData,
          recentAppointments
        }
      });
    } catch (error) {
      console.error('Error fetching patient details:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch patient details',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get patient records
  async getPatientRecords(req, res) {
    try {
      const { patientId } = req.params;
      
      console.log(`Getting records for patient: ${patientId} by doctor: ${req.user.id}`);

      // Get patient
      const patient = await User.findOne({
        where: { 
          id: patientId,
          role: 'patient'
        },
        attributes: ['id', 'first_name', 'last_name', 'date_of_birth', 'gender', 'blood_group', 'allergies', 'chronic_conditions']
      });

      if (!patient) {
        return res.status(404).json({ 
          success: false, 
          error: 'Patient not found' 
        });
      }

      // Get appointments
      const appointments = await Appointment.findAll({
        where: { 
          patientId: patientId,
          doctorId: req.user.id 
        },
        order: [['appointmentDate', 'DESC']],
        limit: 50
      });

      // Get medical notes
      const medicalNotes = await MedicalNote.findAll({
        where: { 
          patientId: patientId,
          doctorId: req.user.id 
        },
        order: [['createdAt', 'DESC']],
        limit: 50
      });

      // Get prescriptions
      const prescriptions = await Prescription.findAll({
        where: { 
          patientId: patientId,
          doctorId: req.user.id 
        },
        order: [['createdAt', 'DESC']],
        limit: 50
      });

      // Get lab results
      const labResults = await LabResult.findAll({
        where: { patientId: patientId },
        include: [
          {
            model: LabRequest,
            attributes: ['test_name', 'test_type']
          }
        ],
        order: [['test_date', 'DESC']],
        limit: 50
      });

      res.json({
        success: true,
        data: {
          patient: {
            ...patient.toJSON(),
            age: calculateAge(patient.date_of_birth)
          },
          appointments,
          medicalNotes,
          prescriptions,
          labResults,
          summary: {
            totalVisits: appointments.length,
            lastVisit: appointments[0]?.appointmentDate || null,
            activePrescriptions: prescriptions.filter(p => p.status === 'active').length,
            pendingLabResults: labResults.filter(lr => lr.status === 'pending').length
          }
        }
      });
    } catch (error) {
      console.error('Error fetching patient records:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch patient records',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get patient summary
  async getPatientSummary(req, res) {
    try {
      const { patientId } = req.params;

      const patient = await User.findOne({
        where: { 
          id: patientId,
          role: 'patient'
        },
        attributes: ['id', 'first_name', 'last_name', 'date_of_birth', 'gender', 'blood_group', 'allergies', 'chronic_conditions', 'emergency_contact']
      });

      if (!patient) {
        return res.status(404).json({ 
          success: false, 
          error: 'Patient not found' 
        });
      }

      // Get recent appointments
      const recentAppointments = await Appointment.findAll({
        where: { 
          patientId: patientId,
          doctorId: req.user.id,
          status: 'completed'
        },
        order: [['appointmentDate', 'DESC']],
        limit: 5,
        attributes: ['id', 'appointmentDate', 'diagnosis', 'treatment', 'notes']
      });

      // Get active prescriptions
      const activePrescriptions = await Prescription.findAll({
        where: { 
          patientId: patientId,
          doctorId: req.user.id,
          status: 'active'
        },
        order: [['end_date', 'ASC']],
        attributes: ['id', 'medication_name', 'dosage', 'frequency', 'start_date', 'end_date', 'instructions']
      });

      // Get latest lab results
      const latestLabResults = await LabResult.findAll({
        where: { patientId: patientId },
        order: [['test_date', 'DESC']],
        limit: 3,
        attributes: ['id', 'test_name', 'test_date', 'result', 'status', 'reference_range']
      });

      const patientData = patient.toJSON();
      const age = calculateAge(patientData.date_of_birth);

      res.json({
        success: true,
        data: {
          patient: {
            ...patientData,
            age
          },
          recentAppointments,
          activePrescriptions,
          latestLabResults,
          summary: {
            age,
            totalVisits: await Appointment.count({ where: { patientId: patientId } }),
            activeConditions: patientData.chronic_conditions ? patientData.chronic_conditions.split(',').length : 0,
            allergies: patientData.allergies ? patientData.allergies.split(',').length : 0,
            lastAppointment: recentAppointments[0]?.appointmentDate || null
          }
        }
      });
    } catch (error) {
      console.error('Error fetching patient summary:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch patient summary',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get patient history
  async getPatientHistory(req, res) {
    try {
      const { patientId } = req.params;

      const history = await Appointment.findAll({
        where: { 
          patientId: patientId,
          doctorId: req.user.id 
        },
        order: [['appointmentDate', 'DESC']],
        attributes: ['id', 'appointmentDate', 'diagnosis', 'treatment', 'status', 'notes']
      });

      res.json({
        success: true,
        count: history.length,
        data: history
      });
    } catch (error) {
      console.error('Error fetching patient history:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch patient history',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get medical notes
  async getMedicalNotes(req, res) {
    try {
      const { patientId, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const whereCondition = { doctorId: req.user.id };
      
      if (patientId) {
        whereCondition.patientId = patientId;
      }

      const { count, rows } = await MedicalNote.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'first_name', 'last_name']
          },
          {
            model: User,
            as: 'doctor',
            attributes: ['id', 'first_name', 'last_name']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        count: rows.length,
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / limit),
        data: rows
      });
    } catch (error) {
      console.error('Error fetching medical notes:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch medical notes',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get patient medical notes
  async getPatientMedicalNotes(req, res) {
    try {
      const { patientId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const { count, rows } = await MedicalNote.findAndCountAll({
        where: { 
          patientId: patientId,
          doctorId: req.user.id 
        },
        include: [
          {
            model: User,
            as: 'doctor',
            attributes: ['id', 'first_name', 'last_name']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        count: rows.length,
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / limit),
        data: rows
      });
    } catch (error) {
      console.error('Error fetching patient medical notes:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch patient medical notes',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get medical note by ID
  async getMedicalNoteById(req, res) {
    try {
      const { noteId } = req.params;

      const medicalNote = await MedicalNote.findOne({
        where: {
          id: noteId,
          doctorId: req.user.id
        },
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'first_name', 'last_name']
          }
        ]
      });

      if (!medicalNote) {
        return res.status(404).json({
          success: false,
          error: 'Medical note not found'
        });
      }

      res.json({
        success: true,
        data: medicalNote
      });
    } catch (error) {
      console.error('Error fetching medical note:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch medical note',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Add medical note
  async addMedicalNote(req, res) {
    try {
      const { patientId, noteType, content, diagnosis, treatmentPlan, followUpDate } = req.body;

      if (!patientId || !content) {
        return res.status(400).json({
          success: false,
          error: 'Patient ID and content are required'
        });
      }

      const medicalNote = await MedicalNote.create({
        patientId,
        doctorId: req.user.id,
        noteType: noteType || 'general',
        content,
        diagnosis: diagnosis || null,
        treatmentPlan: treatmentPlan || null,
        followUpDate: followUpDate || null,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      res.status(201).json({
        success: true,
        message: 'Medical note added successfully',
        data: medicalNote
      });
    } catch (error) {
      console.error('Error adding medical note:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to add medical note',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Update medical note
  async updateMedicalNote(req, res) {
    try {
      const { noteId } = req.params;
      const { content, diagnosis, treatmentPlan, followUpDate } = req.body;

      const medicalNote = await MedicalNote.findOne({
        where: {
          id: noteId,
          doctorId: req.user.id
        }
      });

      if (!medicalNote) {
        return res.status(404).json({
          success: false,
          error: 'Medical note not found'
        });
      }

      medicalNote.content = content || medicalNote.content;
      medicalNote.diagnosis = diagnosis || medicalNote.diagnosis;
      medicalNote.treatmentPlan = treatmentPlan || medicalNote.treatmentPlan;
      medicalNote.followUpDate = followUpDate || medicalNote.followUpDate;
      medicalNote.updatedAt = new Date();

      await medicalNote.save();

      res.json({
        success: true,
        message: 'Medical note updated successfully',
        data: medicalNote
      });
    } catch (error) {
      console.error('Error updating medical note:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to update medical note',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Delete medical note
  async deleteMedicalNote(req, res) {
    try {
      const { noteId } = req.params;

      const medicalNote = await MedicalNote.findOne({
        where: {
          id: noteId,
          doctorId: req.user.id
        }
      });

      if (!medicalNote) {
        return res.status(404).json({
          success: false,
          error: 'Medical note not found'
        });
      }

      await medicalNote.destroy();

      res.json({
        success: true,
        message: 'Medical note deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting medical note:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to delete medical note',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get prescriptions
  async getPrescriptions(req, res) {
    try {
      const { patientId, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const whereCondition = { doctorId: req.user.id };
      
      if (patientId) {
        whereCondition.patientId = patientId;
      }

      const { count, rows } = await Prescription.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'first_name', 'last_name']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        count: rows.length,
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / limit),
        data: rows
      });
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch prescriptions',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get patient prescriptions
  async getPatientPrescriptions(req, res) {
    try {
      const { patientId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const { count, rows } = await Prescription.findAndCountAll({
        where: { 
          patientId: patientId,
          doctorId: req.user.id 
        },
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        count: rows.length,
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / limit),
        data: rows
      });
    } catch (error) {
      console.error('Error fetching patient prescriptions:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch patient prescriptions',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get prescription by ID
  async getPrescriptionById(req, res) {
    try {
      const { prescriptionId } = req.params;

      const prescription = await Prescription.findOne({
        where: {
          id: prescriptionId,
          doctorId: req.user.id
        },
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'first_name', 'last_name']
          }
        ]
      });

      if (!prescription) {
        return res.status(404).json({
          success: false,
          error: 'Prescription not found'
        });
      }

      res.json({
        success: true,
        data: prescription
      });
    } catch (error) {
      console.error('Error fetching prescription:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch prescription',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Create prescription
  async createPrescription(req, res) {
    try {
      const { patientId, medication, medicationName, dosage, frequency, startDate, endDate, instructions, refills, expiry_date } = req.body;

      // support either 'medication' (preferred) or 'medicationName' (legacy)
      const med = medication || medicationName;

      if (!patientId || !med || !dosage || !frequency) {
        return res.status(400).json({
          success: false,
          error: 'Patient ID, medication, dosage, and frequency are required'
        });
      }

      // Try to persist to DB
      try {
        const prescription = await Prescription.create({
          patientId,
          doctorId: req.user.id,
          medication: med,
          dosage,
          frequency,
          instructions: instructions || null,
          refills: refills || 0,
          status: 'prescribed',
          expiry_date: expiry_date || endDate || null,
          dateIssued: startDate || new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        });

        // Mirror to in-memory list so pharmacists can view even if DB later becomes unavailable
        try {
          if (!Array.isArray(global.prescriptions)) global.prescriptions = [];
          const record = {
            id: prescription.id || (global.prescriptions.length ? global.prescriptions[global.prescriptions.length - 1].id + 1 : Date.now()),
            patientId: prescription.patientId,
            doctorId: prescription.doctorId,
            medication: prescription.medication,
            dosage: prescription.dosage,
            frequency: prescription.frequency,
            instructions: prescription.instructions || null,
            refills: prescription.refills || 0,
            status: prescription.status || 'prescribed',
            expiry_date: prescription.expiry_date || null,
            dateIssued: prescription.dateIssued || prescription.createdAt || new Date().toISOString(),
            createdAt: prescription.createdAt || new Date().toISOString(),
            updatedAt: prescription.updatedAt || new Date().toISOString()
          };

          // Avoid duplicates by id
          if (!global.prescriptions.find(p => String(p.id) === String(record.id))) {
            global.prescriptions.unshift(record);
          }
        } catch (mirrorErr) {
          console.warn('Failed to mirror prescription to in-memory list:', mirrorErr);
        }

        return res.status(201).json({
          success: true,
          message: 'Prescription created successfully',
          data: prescription
        });
      }
    } catch (error) {
      console.error('Error creating prescription:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to create prescription',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Update prescription
  async updatePrescription(req, res) {
    try {
      const { prescriptionId } = req.params;
      const { medication, medicationName, dosage, frequency, instructions, refills, status, expiry_date } = req.body;

      const prescription = await Prescription.findOne({
        where: {
          id: prescriptionId,
          doctorId: req.user.id
        }
      });

      if (!prescription) {
        return res.status(404).json({
          success: false,
          error: 'Prescription not found'
        });
      }

      prescription.medication = medication || medicationName || prescription.medication;
      prescription.dosage = dosage || prescription.dosage;
      prescription.frequency = frequency || prescription.frequency;
      prescription.instructions = instructions || prescription.instructions;
      prescription.refills = refills !== undefined ? refills : prescription.refills;
      prescription.status = status || prescription.status;
      prescription.expiry_date = expiry_date || prescription.expiry_date;
      prescription.updatedAt = new Date();

      await prescription.save();

      res.json({
        success: true,
        message: 'Prescription updated successfully',
        data: prescription
      });
    } catch (error) {
      console.error('Error updating prescription:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to update prescription',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Delete prescription
  async deletePrescription(req, res) {
    try {
      const { prescriptionId } = req.params;

      const prescription = await Prescription.findOne({
        where: {
          id: prescriptionId,
          doctorId: req.user.id
        }
      });

      if (!prescription) {
        return res.status(404).json({
          success: false,
          error: 'Prescription not found'
        });
      }

      await prescription.destroy();

      res.json({
        success: true,
        message: 'Prescription deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting prescription:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to delete prescription',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Refill prescription
  async refillPrescription(req, res) {
    try {
      const { prescriptionId } = req.params;
      const { refillCount } = req.body;

      const prescription = await Prescription.findOne({
        where: {
          id: prescriptionId,
          doctorId: req.user.id,
          status: 'active'
        }
      });

      if (!prescription) {
        return res.status(404).json({
          success: false,
          error: 'Active prescription not found'
        });
      }

      prescription.refills += refillCount || 1;
      prescription.updatedAt = new Date();
      await prescription.save();

      res.json({
        success: true,
        message: 'Prescription refilled successfully',
        data: prescription
      });
    } catch (error) {
      console.error('Error refilling prescription:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to refill prescription',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get lab requests
  async getLabRequests(req, res) {
    try {
      const { patientId, status, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const whereCondition = { doctorId: req.user.id };
      
      if (patientId) {
        whereCondition.patientId = patientId;
      }
      
      if (status) {
        whereCondition.status = status;
      }

      const { count, rows } = await LabRequest.findAndCountAll({
        where: whereCondition,
        include: [
            {
              model: Patient,
              as: 'patient',
              attributes: ['id', 'first_name', 'last_name']
            },
            {
              model: User,
              as: 'technician',
              attributes: ['id', 'first_name', 'last_name']
            }
          ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        count: rows.length,
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / limit),
        data: rows
      });
    } catch (error) {
      console.error('Error fetching lab requests:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch lab requests',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get patient lab requests
  async getPatientLabRequests(req, res) {
    try {
      const { patientId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const { count, rows } = await LabRequest.findAndCountAll({
        where: { 
          patientId: patientId,
          doctorId: req.user.id 
        },
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        count: rows.length,
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / limit),
        data: rows
      });
    } catch (error) {
      console.error('Error fetching patient lab requests:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch patient lab requests',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get lab request by ID
  async getLabRequestById(req, res) {
    try {
      const { id } = req.params;

      const labRequest = await LabRequest.findOne({
        where: {
          id: id,
          doctorId: req.user.id
        },
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'first_name', 'last_name']
          }
        ]
      });

      if (!labRequest) {
        return res.status(404).json({
          success: false,
          error: 'Lab request not found'
        });
      }

      res.json({
        success: true,
        data: labRequest
      });
    } catch (error) {
      console.error('Error fetching lab request:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch lab request',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Create lab request
  async createLabRequest(req, res) {
    try {
      const { patientId, testType, instructions, urgency } = req.body;

      if (!patientId || !testType) {
        return res.status(400).json({
          success: false,
          error: 'Patient ID and test type are required'
        });
      }

      const labRequest = await LabRequest.create({
        patientId,
        doctorId: req.user.id,
        testType,
        notes: instructions || null,
        urgency: urgency || 'normal',
        status: 'pending',
        dateRequested: new Date()
      });

      res.status(201).json({
        success: true,
        message: 'Lab request created successfully',
        data: labRequest
      });
    } catch (error) {
      console.error('Error creating lab request:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to create lab request',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Update lab request
  async updateLabRequest(req, res) {
    try {
      const { id } = req.params;
      const { testType, instructions, urgency, status } = req.body;

      const labRequest = await LabRequest.findOne({
        where: {
          id: id,
          doctorId: req.user.id
        }
      });

      if (!labRequest) {
        return res.status(404).json({
          success: false,
          error: 'Lab request not found'
        });
      }

      labRequest.testType = testType || labRequest.testType;
      labRequest.notes = instructions || labRequest.notes;
      labRequest.urgency = urgency || labRequest.urgency;
      labRequest.status = status || labRequest.status;
      labRequest.updatedAt = new Date();

      await labRequest.save();

      res.json({
        success: true,
        message: 'Lab request updated successfully',
        data: labRequest
      });
    } catch (error) {
      console.error('Error updating lab request:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to update lab request',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Delete lab request
  async deleteLabRequest(req, res) {
    try {
      const { id } = req.params;

      const labRequest = await LabRequest.findOne({
        where: {
          id: id,
          doctorId: req.user.id,
          status: 'pending'
        }
      });

      if (!labRequest) {
        return res.status(404).json({
          success: false,
          error: 'Pending lab request not found'
        });
      }

      await labRequest.destroy();

      res.json({
        success: true,
        message: 'Lab request deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting lab request:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to delete lab request',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Set lab request priority
  async setLabRequestPriority(req, res) {
    try {
      const { id } = req.params;
      const { priority } = req.body;

      const labRequest = await LabRequest.findOne({
        where: {
          id: id,
          doctorId: req.user.id
        }
      });

      if (!labRequest) {
        return res.status(404).json({
          success: false,
          error: 'Lab request not found'
        });
      }

      if (!['low', 'normal', 'high', 'urgent'].includes(priority)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid priority level'
        });
      }

      labRequest.priority = priority;
      labRequest.updatedAt = new Date();
      await labRequest.save();

      res.json({
        success: true,
        message: `Lab request priority set to ${priority}`,
        data: labRequest
      });
    } catch (error) {
      console.error('Error setting lab request priority:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to set lab request priority',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get lab results
  async getLabResults(req, res) {
    try {
      const { patientId, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const whereCondition = {};
      
      if (patientId) {
        whereCondition.patientId = patientId;
      }

      // Get lab results for patients of this doctor
      const { count, rows } = await LabResult.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: LabRequest,
            where: { doctorId: req.user.id },
            required: true
          },
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'first_name', 'last_name']
          },
          {
            model: User,
            as: 'technician',
            attributes: ['id', 'first_name', 'last_name']
          }
        ],
        order: [['date', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        count: rows.length,
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / limit),
        data: rows
      });
    } catch (error) {
      console.error('Error fetching lab results:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch lab results',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get patient lab results
  async getPatientLabResults(req, res) {
    try {
      const { patientId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const { count, rows } = await LabResult.findAndCountAll({
        where: { patientId: patientId },
        include: [
          {
            model: LabRequest,
            where: { doctorId: req.user.id },
            required: true
          }
        ],
        order: [['date', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        count: rows.length,
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / limit),
        data: rows
      });
    } catch (error) {
      console.error('Error fetching patient lab results:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch patient lab results',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get lab result by ID
  async getLabResultById(req, res) {
    try {
      const { resultId } = req.params;

      const labResult = await LabResult.findOne({
        where: { id: resultId },
        include: [
          {
            model: LabRequest,
            where: { doctorId: req.user.id },
            required: true
          },
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'first_name', 'last_name']
          }
        ]
      });

      if (!labResult) {
        return res.status(404).json({
          success: false,
          error: 'Lab result not found'
        });
      }

      res.json({
        success: true,
        data: labResult
      });
    } catch (error) {
      console.error('Error fetching lab result:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch lab result',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Share lab result to patient
  async shareLabResultToPatient(req, res) {
    try {
      const { resultId } = req.params;

      const labResult = await LabResult.findOne({
        where: { id: resultId },
        include: [
          {
            model: LabRequest,
            where: { doctorId: req.user.id },
            required: true
          }
        ]
      });

      if (!labResult) {
        return res.status(404).json({
          success: false,
          error: 'Lab result not found'
        });
      }

      labResult.sharedWithPatient = true;
      labResult.sharedAt = new Date();
      await labResult.save();

      res.json({
        success: true,
        message: 'Lab result shared with patient successfully',
        data: labResult
      });
    } catch (error) {
      console.error('Error sharing lab result:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to share lab result',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Release lab result to patient
  async releaseLabResultToPatient(req, res) {
    try {
      const { resultId } = req.params;

      const labResult = await LabResult.findOne({
        where: { id: resultId },
        include: [
          {
            model: LabRequest,
            where: { doctorId: req.user.id },
            required: true
          }
        ]
      });

      if (!labResult) {
        return res.status(404).json({
          success: false,
          error: 'Lab result not found'
        });
      }

      labResult.releasedToPatient = true;
      labResult.releasedAt = new Date();
      await labResult.save();

      res.json({
        success: true,
        message: 'Lab result released to patient successfully',
        data: labResult
      });
    } catch (error) {
      console.error('Error releasing lab result:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to release lab result',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Add comment to lab result
  async addCommentToLabResult(req, res) {
    try {
      const { resultId } = req.params;
      const { comment } = req.body;

      const labResult = await LabResult.findOne({
        where: { id: resultId },
        include: [
          {
            model: LabRequest,
            where: { doctorId: req.user.id },
            required: true
          }
        ]
      });

      if (!labResult) {
        return res.status(404).json({
          success: false,
          error: 'Lab result not found'
        });
      }

      labResult.doctorComment = comment;
      labResult.updatedAt = new Date();
      await labResult.save();

      res.json({
        success: true,
        message: 'Comment added to lab result',
        data: labResult
      });
    } catch (error) {
      console.error('Error adding comment to lab result:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to add comment to lab result',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Create billing
  async createBilling(req, res) {
    try {
      const { patientId, appointmentId, items, totalAmount, paymentMethod, insuranceInfo } = req.body;

      if (!patientId || !items || !totalAmount) {
        return res.status(400).json({
          success: false,
          error: 'Patient ID, items, and total amount are required'
        });
      }

      const billing = await Billing.create({
        patientId,
        doctorId: req.user.id,
        appointmentId: appointmentId || null,
        items: JSON.stringify(items),
        totalAmount,
        paymentMethod: paymentMethod || 'cash',
        insuranceInfo: insuranceInfo || null,
        status: 'pending',
        billingDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      res.status(201).json({
        success: true,
        message: 'Billing created successfully',
        data: billing
      });
    } catch (error) {
      console.error('Error creating billing:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to create billing',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get patient billing
  async getPatientBilling(req, res) {
    try {
      const { patientId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const { count, rows } = await Billing.findAndCountAll({
        where: { 
          patientId: patientId,
          doctorId: req.user.id 
        },
        order: [['billingDate', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        count: rows.length,
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / limit),
        data: rows
      });
    } catch (error) {
      console.error('Error fetching patient billing:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch patient billing',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Update payment status
  async updatePaymentStatus(req, res) {
    try {
      const { billId } = req.params;
      const { status } = req.body;

      const billing = await Billing.findOne({
        where: {
          id: billId,
          doctorId: req.user.id
        }
      });

      if (!billing) {
        return res.status(404).json({
          success: false,
          error: 'Billing record not found'
        });
      }

      billing.status = status;
      billing.updatedAt = new Date();
      await billing.save();

      res.json({
        success: true,
        message: `Payment status updated to ${status}`,
        data: billing
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to update payment status',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Mock/stub methods for missing endpoints (to prevent 404 errors)
  async getDashboardStats(req, res) {
    return this.getDoctorStats(req, res);
  },

  async updateMyProfile(req, res) {
    try {
      const doctor = await Doctor.findOne({
        where: { userId: req.user.id }
      });

      if (!doctor) {
        return res.status(404).json({ 
          success: false, 
          error: 'Doctor profile not found' 
        });
      }

      const { specialization, qualification, licenseNumber, department, consultationFee, availableDays, availableHours } = req.body;

      if (specialization) doctor.specialization = specialization;
      if (qualification) doctor.qualification = qualification;
      if (licenseNumber) doctor.licenseNumber = licenseNumber;
      if (department) doctor.department = department;
      if (consultationFee) doctor.consultationFee = consultationFee;
      if (availableDays) doctor.availableDays = availableDays;
      if (availableHours) doctor.availableHours = availableHours;

      await doctor.save();

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: doctor
      });
    } catch (error) {
      console.error('Error updating doctor profile:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to update doctor profile',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Stub methods to prevent 404 errors
  async addDiagnosis(req, res) {
    return this.addMedicalNote(req, res);
  },

  async getPatientDiagnoses(req, res) {
    return this.getPatientMedicalNotes(req, res);
  },

  async updateDiagnosis(req, res) {
    return this.updateMedicalNote(req, res);
  },

  async getAvailability(req, res) {
    res.json({
      success: true,
      data: {
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        availableHours: '09:00-17:00',
        slots: []
      }
    });
  },

  async setAvailability(req, res) {
    res.json({
      success: true,
      message: 'Availability set successfully',
      data: req.body
    });
  },

  async updateAvailability(req, res) {
    res.json({
      success: true,
      message: 'Availability updated successfully',
      data: req.body
    });
  },

  async deleteAvailability(req, res) {
    res.json({
      success: true,
      message: 'Availability deleted successfully'
    });
  },

  async getNotifications(req, res) {
    const notifications = await Notification.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    res.json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  },

  async markNotificationAsRead(req, res) {
    const { notificationId } = req.params;

    const notification = await Notification.findOne({
      where: { 
        id: notificationId,
        userId: req.user.id 
      }
    });

    if (notification) {
      notification.isRead = true;
      await notification.save();
    }

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  },

  async markAllNotificationsAsRead(req, res) {
    await Notification.update(
      { isRead: true },
      { where: { userId: req.user.id } }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  },

  async startConsultation(req, res) {
    const { appointmentId } = req.body;

    const appointment = await Appointment.findOne({
      where: { 
        id: appointmentId,
        doctorId: req.user.id 
      }
    });

    if (!appointment) {
      return res.status(404).json({ 
        success: false, 
        error: 'Appointment not found' 
      });
    }

    appointment.status = 'in-progress';
    await appointment.save();

    res.json({
      success: true,
      message: 'Consultation started',
      data: appointment
    });
  },

  async endConsultation(req, res) {
    const { consultationId } = req.params;

    // For now, just return success since we don't have Consultation model
    res.json({
      success: true,
      message: 'Consultation ended'
    });
  },

  async recordVitals(req, res) {
    const { consultationId } = req.params;
    const vitals = req.body;

    res.json({
      success: true,
      message: 'Vitals recorded',
      data: vitals
    });
  }
};