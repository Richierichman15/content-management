const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth.middleware');

// Import controller methods
const userController = require('../controllers/user.controller');

// Public routes
// None

// Protected routes
router.use(protect);

// Routes for all authenticated users
router.get('/profile', userController.getUserProfile);
router.put('/profile', userController.updateUserProfile);
router.get('/settings', userController.getUserSettings);
router.put('/settings', userController.updateUserSettings);

// Admin-only routes
router.use(admin);
router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router; 