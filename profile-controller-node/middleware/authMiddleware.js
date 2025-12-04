// middleware/authMiddleware.js
// Verifies JWT with the Auth Controller before allowing profile operations

const axios = require('axios');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'No authentication token provided'
      });
    }

    const response = await axios.post(
      `${AUTH_SERVICE_URL}/api/auth/verify`,
      {},
      {
        headers: { Authorization: authHeader },
        timeout: 5000
      }
    );

    if (response.data.success) {
      req.user = response.data.data.user;
      next();
    } else {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'Authentication service unavailable',
        service: 'profile-controller'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

module.exports = authMiddleware;
