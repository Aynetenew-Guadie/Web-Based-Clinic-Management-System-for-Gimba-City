const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const adminController = require('../controllers/adminController');

router.use(authMiddleware());
router.use(roleMiddleware(['admin']));

// User Management
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
// Admin reset password endpoint - allows admin to set or auto-generate a temp password and email the user
router.post('/users/:id/reset-password', adminController.resetUserPassword);
router.delete('/users/:id', adminController.deleteUser);
router.get('/users/stats', adminController.getUserStats);

// Billing Management
router.get('/billing', adminController.getAllBilling);
router.get('/billing/stats', adminController.getBillingStats);
router.put('/billing/:id', adminController.updateBilling);
router.delete('/billing/:id', adminController.deleteBilling);

// Settings Management
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

// Dashboard Statistics
router.get('/dashboard/stats', adminController.getDashboardStats);

module.exports = router;