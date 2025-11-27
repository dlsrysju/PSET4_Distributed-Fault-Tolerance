// ========== server.js ==========
// SERVER: Main application

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const courseRoutes = require('./routes/courseRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const CourseController = require('./controllers/courseController');

const app = express();
const PORT = process.env.PORT || 4002;

// Middleware
app.use(cors());
app.use(express.json());

// Logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);

// Health check
const courseController = new CourseController();
app.get('/health', (req, res) => courseController.healthCheck(req, res));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('========================================');
  console.log('Course Controller Node (MVC Architecture)');
  console.log('========================================');
  console.log(`Server running on port ${PORT}`);
  console.log(`Auth Service: ${process.env.AUTH_SERVICE_URL || 'http://localhost:4001'}`);
  console.log('========================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  process.exit(0);
});