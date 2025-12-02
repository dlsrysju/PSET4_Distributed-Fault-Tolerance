// ========== server.js ==========
// SERVER: Main application

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const courseRoutes = require('./routes/courseRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const CourseController = require('./controllers/courseController');

// gRPC bootstrap
const { startGrpcServer } = require('./grpcServer');

const app = express();
const PORT = process.env.PORT || 4002;

const courseController = new CourseController();

// ================== MIDDLEWARE ==================
app.use(cors());
app.use(express.json());

// Logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ================== ROUTES ==================
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);

// Health check
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

// ================== START SERVERS ==================
const httpServer = app.listen(PORT, () => {
  console.log('========================================');
  console.log('Course Controller Node (MVC Architecture)');
  console.log('========================================');
  console.log(`HTTP server running on port ${PORT}`);
  console.log(`Auth Service: ${process.env.AUTH_SERVICE_URL || 'http://localhost:4001'}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('========================================');
});

// Start gRPC server (this should return the grpc.Server instance)
const grpcServer = startGrpcServer();

// ================== GRACEFUL SHUTDOWN ==================
function shutdown() {
  console.log('SIGTERM/SIGINT received, shutting down Course service...');

  // Close HTTP server
  httpServer.close(() => {
    console.log('HTTP server closed');
  });

  // Close gRPC server if available
  if (grpcServer && grpcServer.tryShutdown) {
    grpcServer.tryShutdown(() => {
      console.log('gRPC server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
