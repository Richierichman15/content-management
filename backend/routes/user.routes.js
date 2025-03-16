const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth.middleware');

// Import controller methods
const userController = require('../controllers/user.controller');

// All routes are protected and can only be accessed by admins
router.use(protect);
router.use(restrictTo('admin'));

// User CRUD operations
router.get('/', userController.getAllUsers);
router.post('/', userController.createUser);
router.get('/:id', userController.getUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

// Special operations
router.patch('/:id/status', userController.updateUserStatus);
router.patch('/:id/role', userController.updateUserRole);

module.exports = router; 