// ========== routes/courseRoutes.js ==========
// ROUTES: Course endpoints

const express = require('express');
const CourseController = require('../controllers/courseController');
const authMiddleware = require('../middleware/authMiddleware');
const { validateCourseId } = require('../validators/course-validators');

const router = express.Router();
const courseController = new CourseController();

router.get('/', authMiddleware, (req, res) => courseController.getAllCourses(req, res));
router.get('/:id', authMiddleware, validateCourseId, (req, res) => courseController.getCourseById(req, res));

module.exports = router;