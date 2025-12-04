// validators/profile-Validators.js
// Input validation for profile operations

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

const atLeastOneField = body().custom((value, { req }) => {
  const { email, password, firstName, lastName } = req.body || {};
  if (
    email === undefined &&
    password === undefined &&
    firstName === undefined &&
    lastName === undefined
  ) {
    throw new Error('Provide at least one field to update');
  }
  return true;
});

const validateUpdateProfile = [
  atLeastOneField,
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format')
    .isLength({ max: 255 })
    .withMessage('Email must be less than 255 characters')
    .normalizeEmail(),
  body('password')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and a number'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('First name must be less than 100 characters')
    .matches(/^[a-zA-Z\s'-]*$/)
    .withMessage('First name contains invalid characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Last name must be less than 100 characters')
    .matches(/^[a-zA-Z\s'-]*$/)
    .withMessage('Last name contains invalid characters'),
  handleValidationErrors
];

module.exports = {
  validateUpdateProfile,
  handleValidationErrors
};
