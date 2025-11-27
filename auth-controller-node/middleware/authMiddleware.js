// ========== middleware/authMiddleware.js ==========
// MIDDLEWARE: Request authentication

const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No authentication token provided'
      });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

    try {
      const decoded = jwt.verify(token, jwtSecret);
      req.user = decoded;
      next();
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Authentication middleware error'
    });
  }
};

module.exports = authMiddleware;