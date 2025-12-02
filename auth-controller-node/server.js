// ========== server.js ==========
// SERVER: Main application entry point

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const AuthController = require('./controllers/authController');

// ⬇️ NEW: gRPC server bootstrap
const { startGrpcServer } = require('./grpcServer');

const app = express();
const PORT = process.env.PORT || 4001;

const authController = new AuthController();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (req, res) => authController.healthCheck(req, res));

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

// Start HTTP server
const httpServer = app.listen(PORT, () => {
  console.log('========================================');
  console.log('Auth Controller Node (MVC Architecture)');
  console.log('========================================');
  console.log(`HTTP server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('========================================');
});

// Start gRPC server (on its own port, e.g. 50051)
const grpcServer = startGrpcServer();

// Graceful shutdown
function shutdown() {
  console.log('Shutting down Auth service (HTTP + gRPC)...');

  httpServer.close(() => {
    console.log('HTTP server closed');
  });

  if (grpcServer) {
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
