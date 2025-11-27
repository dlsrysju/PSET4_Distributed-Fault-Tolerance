// ========== controllers/courseController.js ==========
// CONTROLLER: Course management logic

const CourseModel = require('../models/courseModel');

class CourseController {
  constructor() {
    this.courseModel = new CourseModel();
  }

  async getAllCourses(req, res) {
    try {
      const courses = await this.courseModel.findAll();
      
      res.json({
        success: true,
        data: courses
      });

    } catch (error) {
      console.error('Get courses error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch courses',
        service: 'course-controller'
      });
    }
  }

  async getCourseById(req, res) {
    try {
      const { id } = req.params;
      const course = await this.courseModel.findById(id);

      if (!course) {
        return res.status(404).json({
          success: false,
          error: 'Course not found'
        });
      }

      res.json({
        success: true,
        data: course
      });

    } catch (error) {
      console.error('Get course error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch course',
        service: 'course-controller'
      });
    }
  }

  async healthCheck(req, res) {
    try {
      const dbHealthy = await this.courseModel.checkDatabaseHealth();
      
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
          service: 'course-controller',
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
          service: 'course-controller',
          status: 'unhealthy',
          error: 'Database unavailable'
        });
      }
    } catch (error) {
      res.status(503).json({ 
        success: false, 
        service: 'course-controller',
        status: 'unhealthy',
        error: error.message
      });
    }
  }
}

module.exports = CourseController;