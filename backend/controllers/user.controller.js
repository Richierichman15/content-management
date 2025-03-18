const User = require('../models/user.model');
const { errorHandler } = require('../utils/errorHandler');
const jwt = require('jsonwebtoken');

/**
 * Get current user profile
 * @route GET /api/users/profile
 * @access Private
 */
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    errorHandler(res, error);
  }
};

/**
 * Update user profile
 * @route PUT /api/users/profile
 * @access Private
 */
exports.updateUserProfile = async (req, res) => {
  try {
    const { name, email, bio, avatar } = req.body;
    
    const userToUpdate = await User.findById(req.user.id);
    
    if (!userToUpdate) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update fields if provided
    if (name) userToUpdate.name = name;
    if (email) userToUpdate.email = email;
    if (bio) userToUpdate.bio = bio;
    if (avatar) userToUpdate.avatar = avatar;
    
    const updatedUser = await userToUpdate.save();
    
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      bio: updatedUser.bio,
      avatar: updatedUser.avatar
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

/**
 * Get all users (admin only)
 * @route GET /api/users
 * @access Private/Admin
 */
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    errorHandler(res, error);
  }
};

/**
 * Get user by ID (admin only)
 * @route GET /api/users/:id
 * @access Private/Admin
 */
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    errorHandler(res, error);
  }
};

/**
 * Update user (admin only)
 * @route PUT /api/users/:id
 * @access Private/Admin
 */
exports.updateUser = async (req, res) => {
  try {
    const { name, email, role, isActive } = req.body;
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update fields if provided
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    
    const updatedUser = await user.save();
    
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      isActive: updatedUser.isActive
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

/**
 * Delete user (admin only)
 * @route DELETE /api/users/:id
 * @access Private/Admin
 */
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prevent deleting own account
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    
    await user.remove();
    
    res.json({ message: 'User removed successfully' });
  } catch (error) {
    errorHandler(res, error);
  }
};

/**
 * Get user settings
 * @route GET /api/users/settings
 * @access Private
 */
exports.getUserSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('settings');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // If no settings yet, return defaults
    if (!user.settings) {
      const defaultSettings = {
        emailNotifications: true,
        contentNotifications: true,
        mediaNotifications: true,
        language: 'en',
        timezone: 'UTC',
        dateFormat: 'MM/DD/YYYY',
        theme: 'light'
      };
      
      return res.json(defaultSettings);
    }
    
    res.json(user.settings);
  } catch (error) {
    errorHandler(res, error);
  }
};

/**
 * Update user settings
 * @route PUT /api/users/settings
 * @access Private
 */
exports.updateUserSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Initialize settings if they don't exist
    if (!user.settings) {
      user.settings = {};
    }
    
    // Update settings
    const { 
      emailNotifications, 
      contentNotifications, 
      mediaNotifications, 
      language, 
      timezone, 
      dateFormat,
      theme
    } = req.body;
    
    if (emailNotifications !== undefined) user.settings.emailNotifications = emailNotifications;
    if (contentNotifications !== undefined) user.settings.contentNotifications = contentNotifications;
    if (mediaNotifications !== undefined) user.settings.mediaNotifications = mediaNotifications;
    if (language) user.settings.language = language;
    if (timezone) user.settings.timezone = timezone;
    if (dateFormat) user.settings.dateFormat = dateFormat;
    if (theme) user.settings.theme = theme;
    
    await user.save();
    
    res.json(user.settings);
  } catch (error) {
    errorHandler(res, error);
  }
}; 