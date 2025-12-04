// profile-controller-node/server.js
// Entry point for profile controller (HTTP + gRPC)

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const profileRoutes = require('./routes/profileRoutes');
const ProfileController = require('./controllers/profileController');
const { startGrpcServer } = require('./grpcServer');

const app = express();
const PORT = process.env.PORT || 4004;

const profileController = new ProfileController();

app.use(cors());
app.use(express.json());

// Simple request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use('/api/profile', profileRoutes);

app.get('/health', (req, res) => profileController.healthCheck(req, res));

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

app.use((err, req, res, next) => {
  console.error('Profile server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

const httpServer = app.listen(PORT, () => {
  console.log('========================================');
  console.log('Profile Controller Node (MVC Architecture)');
  console.log('========================================');
  console.log(`HTTP server running on port ${PORT}`);
  console.log(`Auth Service: ${process.env.AUTH_SERVICE_URL || 'http://localhost:4001'}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('========================================');
});

const grpcServer = startGrpcServer();

function shutdown() {
  console.log('SIGTERM/SIGINT received, shutting down Profile service...');

  httpServer.close(() => {
    console.log('HTTP server closed');
  });

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
