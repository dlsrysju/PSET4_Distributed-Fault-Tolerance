// ========== server.js ==========
// SERVER: Main application

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const gradeRoutes = require('./routes/gradeRoutes');
const GradeController = require('./controllers/gradeController');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());

// Logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/grades', gradeRoutes);

// Health check
const gradeController = new GradeController();
app.get('/health', (req, res) => gradeController.healthCheck(req, res));

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
  console.log('Grade Controller Node (MVC Architecture)');
  console.log('========================================');
  console.log(`Server running on port ${PORT}`);
  console.log(`Auth Service: ${process.env.AUTH_SERVICE_URL || 'http://auth:3001'}`);
  console.log('========================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  process.exit(0);
});