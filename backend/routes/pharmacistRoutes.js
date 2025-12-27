const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const pharmacistController = require('../controllers/pharmacistController');

// Public read route for prescriptions (dev-friendly) - no auth required so the dashboard can display items while debugging.
router.get('/prescriptions', pharmacistController.getPrescriptions);

// Protect remaining routes with authentication and role checks
router.use(authMiddleware());

// Write: require explicit pharmacist role
router.post('/prescriptions/:prescriptionId/dispense', roleMiddleware(['pharmacist']), pharmacistController.dispensePrescription);

// Allow pharmacists to view and update patient details (restricted)
router.get('/patients/:patientId', roleMiddleware(['pharmacist']), pharmacistController.getPatient);
router.put('/patients/:patientId', roleMiddleware(['pharmacist']), pharmacistController.updatePatient);

// Simple drug inventory endpoints (temporary)
router.get('/drugs', pharmacistController.listDrugs);
router.post('/drugs', roleMiddleware(['pharmacist']), pharmacistController.addDrug);

module.exports = router;