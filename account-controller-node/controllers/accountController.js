// controllers/accountController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');

class AccountController {
  constructor() {
    this.userModel = new UserModel();
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    this.jwtExpiry = '24h';
  }

  formatUser(row) {
    return {
      id: row.id,
      email: row.email,
      role: row.role,
      firstName: row.first_name || '',
      lastName: row.last_name || '',
    };
  }

  async createStudent(req, res) {
    try {
      const { email, password, firstName, lastName } = req.body || {};

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
      }

      const exists = await this.userModel.checkExists(email);
      if (exists) {
        return res.status(409).json({
          success: false,
          error: 'User already exists'
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await this.userModel.createStudent({ email, passwordHash, firstName, lastName });
      const payload = this.formatUser(user);

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

      return res.status(201).json({
        success: true,
        data: { user: payload, token }
      });
    } catch (error) {
      console.error('createStudent error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        service: 'account-controller'
      });
    }
  }

  async healthCheck(req, res) {
    try {
      const dbHealthy = await this.userModel.checkDatabaseHealth();
      if (dbHealthy) {
        return res.json({
          success: true,
          service: 'account-controller',
          status: 'healthy',
          timestamp: new Date().toISOString()
        });
      }
      return res.status(503).json({
        success: false,
        service: 'account-controller',
        status: 'unhealthy',
        error: 'Database unavailable'
      });
    } catch (error) {
      return res.status(503).json({
        success: false,
        service: 'account-controller',
        status: 'unhealthy',
        error: error.message
      });
    }
  }
}

module.exports = AccountController;
