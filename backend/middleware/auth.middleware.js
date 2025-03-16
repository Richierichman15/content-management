const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/user.model');

/**
 * Authentication middleware
 * Verifies JWT token and adds user info to request
 */
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // Check if token exists
    if (!token) {
      return res.status(401).json({ message: 'Not authorized - no token provided' });
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from database (exclude password)
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(401).json({ message: 'User not found or token invalid' });
      }
      
      // Check if user is active
      if (user.isActive === false) {
        return res.status(401).json({ message: 'Your account has been deactivated' });
      }
      
      // Add user to request object
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized - token invalid' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Server error in authentication' });
  }
};

/**
 * Optional authentication middleware
 * Tries to authenticate, but continues even if no token or invalid token
 */
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;
    
    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // If no token, continue without auth
    if (!token) {
      return next();
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from database (exclude password)
      const user = await User.findById(decoded.id).select('-password');
      
      // If user exists and is active, add to request
      if (user && user.isActive !== false) {
        req.user = user;
      }
    } catch (error) {
      // Token invalid, continue without auth
    }
    
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next();
  }
};

/**
 * Admin-only middleware
 * Requires the protect middleware to run first
 */
exports.admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized - admin access required' });
  }
};

/**
 * Role-based authorization middleware
 * @param {string[]} roles - Array of roles that are allowed access
 */
exports.authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized - authentication required' });
    }
    
    if (roles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({ 
        message: `Not authorized - ${req.user.role} role cannot access this resource` 
      });
    }
  };
};

/**
 * Role-based access control middleware
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
}; 