/**
 * Global error handler function
 * @param {Object} res - Express response object
 * @param {Error} error - Error object
 * @param {number} statusCode - HTTP status code (optional, defaults to 500)
 */
exports.errorHandler = (res, error, statusCode = 500) => {
  console.error(`Error: ${error.message}`);
  
  // Check for Mongoose validation error
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(val => val.message);
    return res.status(400).json({
      message: 'Validation failed',
      errors: messages
    });
  }
  
  // Check for Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
    });
  }
  
  // Check for Mongoose cast error (invalid ID)
  if (error.name === 'CastError') {
    return res.status(404).json({
      message: `Resource not found with id of ${error.value}`
    });
  }
  
  // Handle JSON Web Token errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Invalid token'
    });
  }
  
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: 'Token expired'
    });
  }
  
  // Return generic error message
  res.status(statusCode).json({
    message: error.message || 'Server Error'
  });
}; 