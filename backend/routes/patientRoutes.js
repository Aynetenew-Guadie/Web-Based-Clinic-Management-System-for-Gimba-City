const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const patientController = require('../controllers/patientController');

// Apply patient authentication middleware to all routes
router.use(authMiddleware('patient'));

// Profile routes
router.get('/profile', patientController.getProfile);
router.put('/profile', patientController.updateProfile);
router.patch('/change-password', patientController.changePassword);

// Appointment routes
router.get('/appointments', patientController.getAppointments);
router.get('/appointments/:appointmentId', patientController.getAppointmentDetails);
router.put('/appointments/:appointmentId/cancel', patientController.cancelAppointment);
router.put('/appointments/:appointmentId/reschedule', patientController.rescheduleAppointment);
router.post('/appointments', patientController.requestAppointment);

// Appointment requests routes
router.get('/appointment-requests', patientController.getAppointmentRequests);
router.put('/appointment-requests/:requestId/cancel', patientController.cancelAppointmentRequest);

// Medical records routes
router.get('/medical-records', patientController.getMedicalRecords);
router.get('/medical-records/:recordId', patientController.getMedicalRecordDetails);

// Prescriptions routes
router.get('/prescriptions', patientController.getPrescriptions);
router.get('/prescriptions/:prescriptionId', patientController.getPrescriptionDetails);

// Lab results routes
router.get('/lab-results', patientController.getLabResults);
router.get('/lab-results/:resultId', patientController.getLabResultDetails);

// Billing routes
router.get('/billing', patientController.getBillingHistory);
router.get('/billing/:invoiceId', patientController.getInvoiceDetails);
router.post('/billing/:invoiceId/pay', patientController.payInvoice);

// Dashboard stats
router.get('/dashboard-stats', patientController.getDashboardStats);

module.exports = router;