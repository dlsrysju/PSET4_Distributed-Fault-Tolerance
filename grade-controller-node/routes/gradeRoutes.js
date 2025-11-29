// ========== routes/gradeRoutes.js ==========
// ROUTES: Grade endpoints

const express = require('express');
const GradeController = require('../controllers/gradeController');
const authMiddleware = require('../middleware/authMiddleware');
const { validateStudentId, validateGradeUpload, validateBatchGradeUpload } = require('../validators/grade-Validators');

const router = express.Router();
const gradeController = new GradeController();

router.get('/my', authMiddleware, (req, res) => gradeController.getMyGrades(req, res));
router.get('/student/:studentId', authMiddleware, validateStudentId, (req, res) => gradeController.getStudentGrades(req, res));
router.post('/upload', authMiddleware, validateGradeUpload, (req, res) => gradeController.uploadGrade(req, res));
router.post('/batch-upload', authMiddleware, validateBatchGradeUpload, (req, res) => gradeController.batchUpload(req, res));
router.get('/enrollments', authMiddleware, (req, res) => gradeController.getFacultyEnrollments(req, res));

module.exports = router;