const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');

// Import controller methods
const authController = require('../controllers/auth.controller');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

// Protected routes
router.use(protect); // All routes below this middleware are protected
router.post('/change-password', authController.changePassword);
router.get('/me', authController.getMe);
router.put('/update-profile', authController.updateProfile);

module.exports = router; 