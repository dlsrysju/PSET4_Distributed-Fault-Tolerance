// ========== controllers/enrollmentController.js ==========
// CONTROLLER: Enrollment management logic

const EnrollmentModel = require('../models/enrollmentModel');
const CourseModel = require('../models/courseModel');

class EnrollmentController {
  constructor() {
    this.enrollmentModel = new EnrollmentModel();
    this.courseModel = new CourseModel();
  }

  async enrollStudent(req, res) {
    try {
      const { courseId } = req.body;
      const studentId = req.user.userId;

      // Authorization check
      if (req.user.role !== 'student') {
        return res.status(403).json({
          success: false,
          error: 'Only students can enroll in courses'
        });
      }

      // Validation
      if (!courseId) {
        return res.status(400).json({
          success: false,
          error: 'Course ID is required'
        });
      }

      // Check if course exists and is open
      const course = await this.courseModel.findById(courseId);

      if (!course) {
        return res.status(404).json({
          success: false,
          error: 'Course not found'
        });
      }

      if (course.status !== 'open') {
        return res.status(400).json({
          success: false,
          error: 'Course is not open for enrollment'
        });
      }

      // Check enrollment capacity
      const enrollmentCount = await this.courseModel.getEnrollmentCount(courseId);

      if (enrollmentCount >= course.max_students) {
        return res.status(400).json({
          success: false,
          error: 'Course is full'
        });
      }

      // Check for duplicate enrollment
      const alreadyEnrolled = await this.enrollmentModel.checkExists(studentId, courseId);

      if (alreadyEnrolled) {
        return res.status(409).json({
          success: false,
          error: 'Already enrolled in this course'
        });
      }

      // Create enrollment
      const enrollment = await this.enrollmentModel.create(studentId, courseId);

      res.status(201).json({
        success: true,
        data: {
          enrollmentId: enrollment.id,
          enrolledAt: enrollment.enrolled_at
        }
      });

    } catch (error) {
      console.error('Enrollment error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to enroll in course',
        service: 'course-controller'
      });
    }
  }

  async getMyEnrollments(req, res) {
    try {
      const studentId = req.user.userId;

      // Authorization check
      if (req.user.role !== 'student') {
        return res.status(403).json({
          success: false,
          error: 'Only students can view enrollments'
        });
      }

      const enrollments = await this.enrollmentModel.findByStudent(studentId);

      res.json({
        success: true,
        data: enrollments
      });

    } catch (error) {
      console.error('Get enrollments error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch enrollments',
        service: 'course-controller'
      });
    }
  }
}

module.exports = EnrollmentController;