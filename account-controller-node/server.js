// account-controller-node/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const accountRoutes = require('./routes/accountRoutes');
const AccountController = require('./controllers/accountController');
const { startGrpcServer } = require('./grpcServer');

const app = express();
const PORT = process.env.PORT || 4006;

const accountController = new AccountController();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use('/api/account', accountRoutes);
app.get('/health', (req, res) => accountController.healthCheck(req, res));

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

app.use((err, req, res, next) => {
  console.error('Account server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

const httpServer = app.listen(PORT, () => {
  console.log('========================================');
  console.log('Account Controller Node (Student Registration)');
  console.log('========================================');
  console.log(`HTTP server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('========================================');
});

const grpcServer = startGrpcServer();

function shutdown() {
  console.log('SIGTERM/SIGINT received, shutting down Account service...');

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
