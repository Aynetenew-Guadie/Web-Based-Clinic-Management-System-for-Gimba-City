const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const receptionistController = require('../controllers/receptionistController');

router.use(authMiddleware());
router.use(roleMiddleware(['receptionist', 'reception', 'admin']));

// ========== PATIENT MANAGEMENT & LOGIN FIXES ==========
// Patient Management
router.post('/register-patient', receptionistController.registerPatient);
router.get('/patients', receptionistController.getPatients);

// NEW ROUTES FOR PATIENT LOGIN FIXES
router.post('/test-patient-login', receptionistController.testPatientLogin);
router.post('/reset-patient-password', receptionistController.resetPatientPassword);
router.get('/debug-patient/:patientId', receptionistController.debugPatientCredentials);

// ========== APPOINTMENT MANAGEMENT ==========
// Appointment Management - ADD ALL MISSING ENDPOINTS
router.post('/schedule-appointment', receptionistController.scheduleAppointment);
router.post('/appointments', receptionistController.scheduleAppointment); // ADD THIS - same function
router.post('/create-appointment', receptionistController.scheduleAppointment); // ADD THIS - same function
router.get('/scheduled-appointments', receptionistController.getScheduledAppointments);
router.get('/appointments', receptionistController.getAllAppointments);

// ========== QUEUE MANAGEMENT ==========
// Queue Management
router.get('/patient-queue', receptionistController.getPatientQueue);
router.post('/check-in-patient', receptionistController.checkInPatient);

// ========== APPOINTMENT REQUESTS ==========
// Appointment Requests
router.get('/appointment-requests', receptionistController.getAppointmentRequests);
router.post('/process-appointment-request', receptionistController.processAppointmentRequest);

// ========== DOCTOR MANAGEMENT ==========
// Doctor Management
router.get('/available-doctors', receptionistController.getAvailableDoctors);
router.get('/doctors', receptionistController.getAllDoctors);

// ========== BILLING MANAGEMENT ==========
// Billing Management
router.get('/billing', receptionistController.getAllBilling);
router.put('/billing/:billingId/payment', receptionistController.updatePaymentStatus);

// Comprehensive Billing Routes
router.post('/create-comprehensive-billing', receptionistController.createComprehensiveBilling);
router.post('/billing/:billingId/mark-paid', receptionistController.markAsPaid);
router.post('/create-billing-for-appointment', receptionistController.createBillingForAppointment);

// ========== DASHBOARD & REPORTS ==========
// Dashboard Statistics - ADD MISSING ENDPOINTS
router.get('/dashboard/stats', receptionistController.getDashboardStats);
router.get('/today-appointments', receptionistController.getTodayAppointments);

module.exports = router;