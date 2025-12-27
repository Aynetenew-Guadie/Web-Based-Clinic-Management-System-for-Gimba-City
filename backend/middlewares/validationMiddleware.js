const { body, validationResult } = require('express-validator');

/**
 * Middleware to validate and sanitize request data
 * @param {Array} validations - Array of validation rules
 * @returns {Function} - Express middleware function
 */
function validate(validations) {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  };
}

const commonValidations = {
  email: body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
  password: body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  username: body('username').isLength({ min: 3 }).trim().withMessage('Username must be at least 3 characters'),
  required: (field) => body(field).notEmpty().trim().withMessage(`${field} is required`),
  date: (field) => body(field).isISO8601().withMessage(`${field} must be a valid date`),
  integer: (field) => body(field).isInt().withMessage(`${field} must be an integer`),
  decimal: (field) => body(field).isDecimal().withMessage(`${field} must be a decimal number`)
};

module.exports = { validate, commonValidations };
