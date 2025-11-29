// ========== validators/courseValidators.js ==========
// VALIDATION: Input validation rules for courses and enrollments

const { body, param, validationResult } = require('express-validator');

// Validation result handler middleware
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

// Course ID parameter validation
const validateCourseId = [
  param('id')
    .notEmpty()
    .withMessage('Course ID is required')
    .isInt({ min: 1 })
    .withMessage('Course ID must be a positive integer')
    .toInt(),
  handleValidationErrors
];

// Enrollment validation rules
const validateEnrollment = [
  body('courseId')
    .notEmpty()
    .withMessage('Course ID is required')
    .isInt({ min: 1 })
    .withMessage('Course ID must be a positive integer')
    .toInt(),
  handleValidationErrors
];

module.exports = {
  validateCourseId,
  validateEnrollment,
  handleValidationErrors
};