// ========== controllers/gradeController.js ==========
// CONTROLLER: Grade management logic

const GradeModel = require('../models/gradeModel');

class GradeController {
  constructor() {
    this.gradeModel = new GradeModel();
  }

  async getStudentGrades(req, res) {
    try {
      const { studentId } = req.params;
      const requesterId = req.user.userId;

      // Authorization: Students can only view their own grades
      if (req.user.role === 'student' && requesterId !== parseInt(studentId)) {
        return res.status(403).json({
          success: false,
          error: 'You can only view your own grades'
        });
      }

      const grades = await this.gradeModel.findByStudent(studentId);

      res.json({
        success: true,
        data: grades
      });

    } catch (error) {
      console.error('Get grades error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch grades',
        service: 'grade-controller'
      });
    }
  }

  async getMyGrades(req, res) {
    try {
      const studentId = req.user.userId;

      // Authorization check
      if (req.user.role !== 'student') {
        return res.status(403).json({
          success: false,
          error: 'Only students can view grades'
        });
      }

      const grades = await this.gradeModel.findByStudent(studentId);

      res.json({
        success: true,
        data: grades
      });

    } catch (error) {
      console.error('Get my grades error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch grades',
        service: 'grade-controller'
      });
    }
  }

  async uploadGrade(req, res) {
    try {
      const { enrollmentId, grade, remarks } = req.body;
      const facultyId = req.user.userId;

      // Authorization check
      if (req.user.role !== 'faculty') {
        return res.status(403).json({
          success: false,
          error: 'Only faculty can upload grades'
        });
      }

      // Validation
      if (!enrollmentId || !grade) {
        return res.status(400).json({
          success: false,
          error: 'Enrollment ID and grade are required'
        });
      }

      // Verify enrollment exists and faculty teaches the course
      const enrollment = await this.gradeModel.getEnrollmentDetails(enrollmentId);

      if (!enrollment) {
        return res.status(404).json({
          success: false,
          error: 'Enrollment not found'
        });
      }

      if (enrollment.faculty_id !== facultyId) {
        return res.status(403).json({
          success: false,
          error: 'You can only upload grades for your own courses'
        });
      }

      // Check if grade already exists
      const existingGrade = await this.gradeModel.findByEnrollment(enrollmentId);

      let result;
      if (existingGrade) {
        // Update existing grade
        result = await this.gradeModel.update(enrollmentId, grade, remarks, facultyId);
      } else {
        // Create new grade
        result = await this.gradeModel.create(enrollmentId, grade, remarks, facultyId);
      }

      res.status(201).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Upload grade error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload grade',
        service: 'grade-controller'
      });
    }
  }

  async getFacultyEnrollments(req, res) {
    try {
      const facultyId = req.user.userId;

      // Authorization check
      if (req.user.role !== 'faculty') {
        return res.status(403).json({
          success: false,
          error: 'Only faculty can view enrollments'
        });
      }

      const enrollments = await this.gradeModel.getFacultyEnrollments(facultyId);

      res.json({
        success: true,
        data: enrollments
      });

    } catch (error) {
      console.error('Get faculty enrollments error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch enrollments',
        service: 'grade-controller'
      });
    }
  }

  async batchUpload(req, res) {
    try {
      const { grades } = req.body;
      const facultyId = req.user.userId;

      // Authorization check
      if (req.user.role !== 'faculty') {
        return res.status(403).json({
          success: false,
          error: 'Only faculty can upload grades'
        });
      }

      // Validation
      if (!Array.isArray(grades) || grades.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Grades array is required'
        });
      }

      const results = [];

      for (const gradeData of grades) {
        const { enrollmentId, grade, remarks } = gradeData;

        // Verify enrollment and authorization
        const enrollment = await this.gradeModel.getEnrollmentDetails(enrollmentId);

        if (!enrollment) {
          throw new Error(`Enrollment ${enrollmentId} not found`);
        }

        if (enrollment.faculty_id !== facultyId) {
          throw new Error(`Not authorized for enrollment ${enrollmentId}`);
        }

        // Upsert grade
        const existingGrade = await this.gradeModel.findByEnrollment(enrollmentId);
        let result;

        if (existingGrade) {
          result = await this.gradeModel.update(enrollmentId, grade, remarks, facultyId);
        } else {
          result = await this.gradeModel.create(enrollmentId, grade, remarks, facultyId);
        }

        results.push(result);
      }

      res.status(201).json({
        success: true,
        data: {
          uploaded: results.length,
          grades: results
        }
      });

    } catch (error) {
      console.error('Batch upload error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to batch upload grades',
        service: 'grade-controller'
      });
    }
  }

  async healthCheck(req, res) {
    try {
      const dbHealthy = await this.gradeModel.checkDatabaseHealth();
      
      // Check auth service
      const axios = require('axios');
      const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';
      let authServiceStatus = 'unknown';
      
      try {
        await axios.get(`${AUTH_SERVICE_URL}/health`, { timeout: 2000 });
        authServiceStatus = 'healthy';
      } catch (error) {
        authServiceStatus = 'unavailable';
      }

      if (dbHealthy) {
        res.json({ 
          success: true, 
          service: 'grade-controller',
          status: 'healthy',
          dependencies: {
            authService: authServiceStatus,
            database: 'healthy'
          },
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(503).json({ 
          success: false, 
          service: 'grade-controller',
          status: 'unhealthy',
          error: 'Database unavailable'
        });
      }
    } catch (error) {
      res.status(503).json({ 
        success: false, 
        service: 'grade-controller',
        status: 'unhealthy',
        error: error.message
      });
    }
  }
}

module.exports = GradeController;