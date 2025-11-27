// ========== routes/courseRoutes.js ==========
// ROUTES: Course endpoints

const express = require('express');
const CourseController = require('../controllers/courseController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
const courseController = new CourseController();

router.get('/', authMiddleware, (req, res) => courseController.getAllCourses(req, res));
router.get('/:id', authMiddleware, (req, res) => courseController.getCourseById(req, res));

module.exports = router;
