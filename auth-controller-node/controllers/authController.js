// ========== controllers/authController.js ==========
// CONTROLLER: Authentication business logic

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');

class AuthController {
  constructor() {
    this.userModel = new UserModel();
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    this.jwtExpiry = '24h';
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
      }

      // Find user (MODEL)
      const user = await this.userModel.findByEmail(email);

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials auth'
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials auth'
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          firstName: user.first_name,
          lastName: user.last_name
        },
        this.jwtSecret,
        { expiresIn: this.jwtExpiry }
      );

      // Return response (to VIEW)
      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            firstName: user.first_name,
            lastName: user.last_name
          }
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        service: 'auth-controller'
      });
    }
  }

  async register(req, res) {
    try {
      const { email, password, role, firstName, lastName } = req.body;

      // Validation
      if (!email || !password || !role) {
        return res.status(400).json({
          success: false,
          error: 'Email, password, and role are required'
        });
      }

      if (!['student', 'faculty'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: 'Role must be either student or faculty'
        });
      }

      // Check if user exists (MODEL)
      const exists = await this.userModel.checkExists(email);

      if (exists) {
        return res.status(409).json({
          success: false,
          error: 'User already exists'
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user (MODEL)
      const user = await this.userModel.create({
        email,
        passwordHash,
        role,
        firstName,
        lastName
      });

      // Return response (to VIEW)
      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            firstName: user.first_name,
            lastName: user.last_name
          }
        }
      });

    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        service: 'auth-controller'
      });
    }
  }

  async verify(req, res) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'No token provided'
        });
      }

      const token = authHeader.substring(7);

      try {
        const decoded = jwt.verify(token, this.jwtSecret);
        
        res.json({
          success: true,
          data: {
            valid: true,
            user: decoded
          }
        });
      } catch (jwtError) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token'
        });
      }

    } catch (error) {
      console.error('Verify error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        service: 'auth-controller'
      });
    }
  }

  async logout(req, res) {
    // In stateless JWT, logout is client-side
    console.log('User logout requested');
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  }

  async healthCheck(req, res) {
    try {
      const dbHealthy = await this.userModel.checkDatabaseHealth();
      
      if (dbHealthy) {
        res.json({ 
          success: true, 
          service: 'auth-controller',
          status: 'healthy',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(503).json({ 
          success: false, 
          service: 'auth-controller',
          status: 'unhealthy',
          error: 'Database unavailable'
        });
      }
    } catch (error) {
      res.status(503).json({ 
        success: false, 
        service: 'auth-controller',
        status: 'unhealthy',
        error: error.message
      });
    }
  }
}

module.exports = AuthController;