// validators/account-Validators.js
const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

const validateCreateStudent = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .isLength({ max: 255 }).withMessage('Email must be less than 255 characters')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and a number'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('First name must be less than 100 characters')
    .matches(/^[a-zA-Z\\s'-]*$/).withMessage('First name contains invalid characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Last name must be less than 100 characters')
    .matches(/^[a-zA-Z\\s'-]*$/).withMessage('Last name contains invalid characters'),
  handleValidationErrors
];

module.exports = {
  validateCreateStudent,
  handleValidationErrors
};
