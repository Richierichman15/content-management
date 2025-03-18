/**
 * Custom error classes for the application
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = {}) {
    super(message, 400);
    this.errors = errors;
    this.name = 'ValidationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Global error handler for consistent error responses
 * @param {Object} res - Express response object
 * @param {Error} error - Error object
 */
const errorHandler = (res, error) => {
  // Log the error for server-side debugging
  console.error('ERROR:', error);

  // MongoDB validation error
  if (error.name === 'ValidationError') {
    const errors = {};
    
    // Format mongoose validation errors
    Object.keys(error.errors).forEach(key => {
      errors[key] = error.errors[key].message;
    });
    
    return res.status(400).json({
      status: 'fail',
      message: 'Validation error',
      errors
    });
  }

  // MongoDB duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      status: 'fail',
      message: `Duplicate field: ${field}. Please use another value.`,
      field
    });
  }

  // MongoDB cast error (invalid ID)
  if (error.name === 'CastError') {
    return res.status(400).json({
      status: 'fail',
      message: `Invalid ${error.path}: ${error.value}`
    });
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'fail',
      message: 'Invalid token. Please log in again.'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'fail',
      message: 'Your token has expired. Please log in again.'
    });
  }

  // Custom AppError
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      status: error.status,
      message: error.message,
      ...(error.errors && { errors: error.errors })
    });
  }

  // Default error (unexpected)
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : error.message || 'Unknown error occurred',
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  });
};

/**
 * Async handler to avoid try-catch blocks in controllers
 * @param {Function} fn - Async function to wrap
 * @returns {Function} - Express middleware function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(err => errorHandler(res, err));
  };
};

module.exports = {
  errorHandler,
  asyncHandler,
  AppError,
  ValidationError,
  AuthorizationError,
  NotFoundError
}; 