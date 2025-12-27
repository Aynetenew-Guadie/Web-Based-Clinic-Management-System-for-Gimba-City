
class ApiError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'ApiError';
  }
}

/**
 * Create a standardized error response
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @returns {Object} - Standardized error response
 */
function formatErrorResponse(error, req) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const response = {
    error: error.message || 'Internal server error',
    statusCode: error.statusCode || 500,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  };

  if (isDevelopment && error.stack) {
    response.stack = error.stack;
  }

  if (error.details) {
    response.details = error.details;
  }

  return response;
}

/**
 * Async error wrapper for route handlers
 * @param {Function} fn - Async route handler function
 * @returns {Function} - Wrapped function with error handling
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

const ErrorMessages = {
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access denied',
  NOT_FOUND: 'Resource not found',
  VALIDATION_FAILED: 'Validation failed',
  INTERNAL_ERROR: 'Internal server error',
  DATABASE_ERROR: 'Database operation failed',
  INVALID_INPUT: 'Invalid input provided'
};

module.exports = {
  ApiError,
  formatErrorResponse,
  asyncHandler,
  ErrorMessages
};
