const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const doctorController = require('../controllers/doctorController');

// Apply doctor authentication middleware
router.use(authMiddleware('doctor'));

// Debug middleware to log all doctor routes
router.use((req, res, next) => {
  console.log(`[DOCTOR ROUTE] ${req.method} ${req.originalUrl} - User: ${req.user?.id}`);
  next();
});

// ==================== HEALTH CHECK ====================
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Doctor routes are working',
    timestamp: new Date().toISOString(),
    user: req.user ? { id: req.user.id, role: req.user.role } : 'Not authenticated'
  });
});

// ==================== DOCTOR PROFILE ====================
router.get('/me', doctorController.getMyProfile);
router.put('/me', doctorController.updateMyProfile);

// ==================== STATISTICS ====================
router.get('/stats', doctorController.getDoctorStats);
router.get('/dashboard-stats', doctorController.getDashboardStats);

// ==================== APPOINTMENTS ====================
router.get('/appointments/today', doctorController.getTodaysAppointments);
router.get('/appointments', doctorController.getAllAppointments);
router.get('/appointments/upcoming', doctorController.getUpcomingAppointments);
router.get('/appointments/pending', doctorController.getPendingAppointments);
router.get('/appointments/:appointmentId', doctorController.getAppointmentDetails);
router.put('/appointments/:appointmentId/status', doctorController.updateAppointmentStatus);
router.post('/appointments/:appointmentId/complete', doctorController.completeAppointment);
router.put('/appointments/:appointmentId/reschedule', doctorController.rescheduleAppointment);
router.post('/appointments/:appointmentId/cancel', doctorController.cancelAppointment);

// ==================== PATIENTS ====================
router.get('/patients/search', doctorController.searchPatients);
router.get('/patients', doctorController.getMyPatients);
router.get('/patients/:patientId', doctorController.getPatientDetails);
router.get('/patients/:patientId/records', doctorController.getPatientRecords);
router.get('/patients/:patientId/summary', doctorController.getPatientSummary);
router.get('/patients/:patientId/history', doctorController.getPatientHistory);

// ==================== MEDICAL NOTES ====================
router.get('/medical-notes', doctorController.getMedicalNotes);
router.get('/medical-notes/patient/:patientId', doctorController.getPatientMedicalNotes);
router.get('/medical-notes/:noteId', doctorController.getMedicalNoteById);
router.post('/medical-notes', doctorController.addMedicalNote);
router.put('/medical-notes/:noteId', doctorController.updateMedicalNote);
router.delete('/medical-notes/:noteId', doctorController.deleteMedicalNote);

// ==================== PRESCRIPTIONS ====================
router.get('/prescriptions', doctorController.getPrescriptions);
router.get('/prescriptions/patient/:patientId', doctorController.getPatientPrescriptions);
router.get('/prescriptions/:prescriptionId', doctorController.getPrescriptionById);
router.post('/prescriptions', doctorController.createPrescription);
router.put('/prescriptions/:prescriptionId', doctorController.updatePrescription);
router.delete('/prescriptions/:prescriptionId', doctorController.deletePrescription);
router.post('/prescriptions/:prescriptionId/refill', doctorController.refillPrescription);

// ==================== LAB REQUESTS ====================
router.get('/lab-technicians', doctorController.getLabTechnicians);
router.get('/lab-requests', doctorController.getLabRequests);
router.get('/lab-requests/patient/:patientId', doctorController.getPatientLabRequests);
router.get('/lab-requests/:id', doctorController.getLabRequestById);
router.post('/lab-requests', doctorController.createLabRequest);
router.put('/lab-requests/:id', doctorController.updateLabRequest);
router.delete('/lab-requests/:id', doctorController.deleteLabRequest);
router.post('/lab-requests/:id/priority', doctorController.setLabRequestPriority);

// ==================== LAB RESULTS ====================
router.get('/lab-results', doctorController.getLabResults);
router.get('/lab-results/patient/:patientId', doctorController.getPatientLabResults);
router.get('/lab-results/:resultId', doctorController.getLabResultById);
router.put('/lab-results/:resultId/share', doctorController.shareLabResultToPatient);
router.put('/lab-results/:resultId/release', doctorController.releaseLabResultToPatient);
router.post('/lab-results/:resultId/comment', doctorController.addCommentToLabResult);

// ==================== DIAGNOSIS ====================
router.post('/diagnosis', doctorController.addDiagnosis);
router.get('/diagnosis/patient/:patientId', doctorController.getPatientDiagnoses);
router.put('/diagnosis/:diagnosisId', doctorController.updateDiagnosis);

// ==================== BILLING ====================
router.post('/billing', doctorController.createBilling);
router.get('/billing/patient/:patientId', doctorController.getPatientBilling);
router.put('/billing/:billId/payment-status', doctorController.updatePaymentStatus);

// ==================== AVAILABILITY ====================
router.get('/availability', doctorController.getAvailability);
router.post('/availability', doctorController.setAvailability);
router.put('/availability/:availabilityId', doctorController.updateAvailability);
router.delete('/availability/:availabilityId', doctorController.deleteAvailability);

// ==================== NOTIFICATIONS ====================
router.get('/notifications', doctorController.getNotifications);
router.put('/notifications/:notificationId/read', doctorController.markNotificationAsRead);
router.put('/notifications/read-all', doctorController.markAllNotificationsAsRead);

// ==================== CONSULTATIONS ====================
router.post('/consultations/start', doctorController.startConsultation);
router.post('/consultations/:consultationId/end', doctorController.endConsultation);
router.post('/consultations/:consultationId/vitals', doctorController.recordVitals);

// ==================== TEST ENDPOINT ====================
router.get('/test-endpoints', (req, res) => {
  const endpoints = [
    { method: 'GET', path: '/api/doctor/health', description: 'Health check' },
    { method: 'GET', path: '/api/doctor/me', description: 'Get doctor profile' },
    { method: 'GET', path: '/api/doctor/stats', description: 'Get doctor statistics' },
    { method: 'GET', path: '/api/doctor/appointments/today', description: 'Get today\'s appointments' },
    { method: 'GET', path: '/api/doctor/dashboard-stats', description: 'Get dashboard statistics' },
    { method: 'GET', path: '/api/doctor/lab-technicians', description: 'Get lab technicians' },
    { method: 'GET', path: '/api/doctor/patients/search', description: 'Search patients' },
    { method: 'GET', path: '/api/doctor/patients', description: 'Get my patients' },
    { method: 'GET', path: '/api/doctor/medical-notes', description: 'Get medical notes' },
    { method: 'GET', path: '/api/doctor/prescriptions', description: 'Get prescriptions' },
    { method: 'GET', path: '/api/doctor/lab-requests', description: 'Get lab requests' },
    { method: 'GET', path: '/api/doctor/lab-results', description: 'Get lab results' },
    { method: 'GET', path: '/api/doctor/notifications', description: 'Get notifications' },
    { method: 'GET', path: '/api/doctor/availability', description: 'Get availability' },
    { method: 'POST', path: '/api/doctor/consultations/start', description: 'Start consultation' },
    { method: 'POST', path: '/api/doctor/billing', description: 'Create billing' }
  ];
  
  res.json({
    success: true,
    message: 'Doctor endpoints are registered and working',
    endpoints: endpoints,
    count: endpoints.length,
    user: req.user ? { id: req.user.id, role: req.user.role } : null,
    timestamp: new Date().toISOString()
  });
});

// ==================== FALLBACK ROUTE ====================
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `The requested endpoint ${req.originalUrl} does not exist`,
    availableMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    timestamp: new Date().toISOString()
  });
});

module.exports = router;