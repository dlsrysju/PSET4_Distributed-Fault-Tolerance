// auth-controller-node/grpcServer.js
const jwt = require('jsonwebtoken');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const AuthController = require('./controllers/authController');

const PROTO_PATH = path.join(__dirname, '..' ,'protos', 'auth.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const authProto = grpc.loadPackageDefinition(packageDefinition).auth;

// Single controller instance we can reuse
const authController = new AuthController();

/**
 * Adapt an Express-style controller to gRPC
 * This assumes your controller method looks like (req, res) => { res.json(...); }
 */
function callExpressHandler(handler, { body = {}, headers = {} }) {
  return new Promise((resolve, reject) => {
    const req = { body, headers };

    const res = {
      _status: 200,
      status(code) {
        this._status = code;
        return this;
      },
      json(payload) {
        if (this._status >= 400) {
          const err = new Error(payload.error || 'Request failed');
          err.httpStatus = this._status;
          return reject(err);
        }
        resolve(payload);
      },
    };

    try {
      handler.call(authController, req, res);
    } catch (e) {
      reject(e);
    }
  });
}

// gRPC: Login
async function login(call, callback) {
  const { email, password } = call.request;

  try {
    const result = await callExpressHandler(authController.login, {
      body: { email, password },
    });
    // result is exactly what your Express controller sent:
    // { success: true, data: { token, user } }

    callback(null, {
      success: result.success,                 // ⬅️ IMPORTANT
      error: result.error || '',
      token: result.data?.token || '',
      user: result.data?.user || null,
    });
  } catch (err) {
    console.error('gRPC Login error:', err);

    if (err.httpStatus === 400) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: err.message || 'Email and password are required',
      });
    }

    if (err.httpStatus === 401) {
      return callback({
        code: grpc.status.UNAUTHENTICATED,
        message: 'Invalid credentials',
      });
    }

    return callback({
      code: grpc.status.INTERNAL,
      message: 'Internal auth error',
    });
  }
}

// gRPC: ValidateToken
async function validateToken(call, callback) {
  const { token } = call.request;

  if (!token) {
    return callback(null, {
      valid: false,
      userId: '',
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // pick whatever you used when signing in login()
    const userId =
      String(payload.userId || payload.id || '');

    callback(null, {
      valid: true,
      userId,
    });
  } catch (err) {
    console.error('gRPC ValidateToken error:', err);

    // For token errors we just return valid:false instead of throwing a gRPC error
    callback(null, {
      valid: false,
      userId: '',
    });
  }
}


function startGrpcServer() {
  const server = new grpc.Server();

  server.addService(authProto.AuthService.service, {
    Login: login,
    ValidateToken: validateToken,
  });

  const GRPC_PORT = process.env.GRPC_PORT || '50051';

  server.bindAsync(
    '0.0.0.0:' + GRPC_PORT,
    grpc.ServerCredentials.createInsecure(),
    (err, boundPort) => {
      if (err) {
        console.error('Failed to bind gRPC server:', err);
        return;
      }
      console.log(`Auth gRPC server running on port ${boundPort}`);
      server.start();
    }
  );

  return server;
}

module.exports = { startGrpcServer };