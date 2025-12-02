// auth-controller-node/grpcServer.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const AuthController = require('./controllers/authController');

// where your auth.proto is
const PROTO_PATH = path.join(__dirname, 'protos', 'auth.proto');

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
  const { username, password } = call.request;

  try {
    // ⬇️ adjust to match your actual login method name if needed
    const result = await callExpressHandler(authController.login, {
      body: { username, password },
    });

    // Expecting result to contain { token }
    callback(null, { token: result.token });
  } catch (err) {
    console.error('gRPC Login error:', err);
    const grpcError = {
      code: grpc.status.UNAUTHENTICATED,
      message: 'Invalid credentials',
    };
    callback(grpcError, null);
  }
}

// gRPC: ValidateToken
async function validateToken(call, callback) {
  const { token } = call.request;

  try {
    // Replace this with however you currently verify JWTs
    // e.g. const payload = jwt.verify(token, process.env.JWT_SECRET);
    const payload = await authController.verifyToken(token); // you implement this

    callback(null, {
      valid: true,
      userId: payload.userId,
    });
  } catch (err) {
    console.error('gRPC ValidateToken error:', err);
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