const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const labController = require('../controllers/labController');

router.use(authMiddleware());

// Test routes
router.get('/pending-tests', labController.getPendingTests);
router.get('/in-progress-tests', labController.getInProgressTests);
router.post('/accept-test-request', labController.acceptTestRequest);
router.post('/enter-test-result', labController.enterTestResult);
router.get('/completed-tests', labController.getCompletedTests);
router.get('/test/:id', labController.getTestById);

// Additional routes
router.get('/stats', labController.getLabStats);
router.get('/all-tests', labController.getAllTests); // For debugging

module.exports = router;