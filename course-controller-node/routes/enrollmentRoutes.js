// ========== routes/enrollmentRoutes.js ==========
// ROUTES: Enrollment endpoints

const express = require('express');
const EnrollmentController = require('../controllers/enrollmentController');
const authMiddleware = require('../middleware/authMiddleware');
const { validateEnrollment } = require('../validators/course-validators');

const router = express.Router();
const enrollmentController = new EnrollmentController();

router.post('/', authMiddleware, validateEnrollment, (req, res) => enrollmentController.enrollStudent(req, res));
router.get('/my', authMiddleware, (req, res) => enrollmentController.getMyEnrollments(req, res));

module.exports = router;