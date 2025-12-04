// controllers/profileController.js
// Business logic for reading and updating user profiles

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ProfileModel = require('../models/profileModel');

class ProfileController {
  constructor() {
    this.profileModel = new ProfileModel();
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

  async getProfile(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const user = await this.profileModel.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      return res.json({
        success: true,
        data: {
          user: this.formatUser(user)
        }
      });
    } catch (error) {
      console.error('getProfile error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        service: 'profile-controller'
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const { email, password, firstName, lastName } = req.body || {};

      if (
        email === undefined &&
        password === undefined &&
        firstName === undefined &&
        lastName === undefined
      ) {
        return res.status(400).json({
          success: false,
          error: 'Provide at least one field to update'
        });
      }

      if (password && password.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 8 characters'
        });
      }

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format'
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const existingUser = await this.profileModel.findById(userId);
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      if (email && email !== existingUser.email) {
        const emailOwner = await this.profileModel.findByEmail(email);
        if (emailOwner && emailOwner.id !== existingUser.id) {
          return res.status(409).json({
            success: false,
            error: 'Email already in use'
          });
        }
      }

      let passwordHash;
      if (password) {
        passwordHash = await bcrypt.hash(password, 10);
      }

      const updated = await this.profileModel.updateUser(userId, {
        email,
        passwordHash,
        firstName,
        lastName
      });

      const userPayload = this.formatUser(updated);

      const token = jwt.sign(
        {
          userId: updated.id,
          email: updated.email,
          role: updated.role,
          firstName: updated.first_name,
          lastName: updated.last_name
        },
        this.jwtSecret,
        { expiresIn: this.jwtExpiry }
      );

      return res.json({
        success: true,
        data: {
          user: userPayload,
          token
        }
      });
    } catch (error) {
      console.error('updateProfile error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        service: 'profile-controller'
      });
    }
  }

  async healthCheck(req, res) {
    try {
      const dbHealthy = await this.profileModel.checkDatabaseHealth();

      if (dbHealthy) {
        res.json({
          success: true,
          service: 'profile-controller',
          status: 'healthy',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(503).json({
          success: false,
          service: 'profile-controller',
          status: 'unhealthy',
          error: 'Database unavailable'
        });
      }
    } catch (error) {
      res.status(503).json({
        success: false,
        service: 'profile-controller',
        status: 'unhealthy',
        error: error.message
      });
    }
  }
}

module.exports = ProfileController;
