// account-controller-node/grpcServer.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const AccountController = require('./controllers/accountController');

const PROTO_PATH = path.join(__dirname, '..', 'protos', 'account.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const accountProto = grpc.loadPackageDefinition(packageDefinition).account;
const accountController = new AccountController();

function callExpressHandler(handler, controller, {
  body = {},
  params = {},
  query = {},
  user = null,
} = {}) {
  return new Promise((resolve, reject) => {
    const req = { body, params, query, user };

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
          err.payload = payload;
          return reject(err);
        }
        return resolve(payload);
      },
    };

    try {
      handler.call(controller, req, res);
    } catch (err) {
      reject(err);
    }
  });
}

async function createStudent(call, callback) {
  const { email, password, firstName, lastName } = call.request;

  if (!email || !password) {
    return callback({
      code: grpc.status.INVALID_ARGUMENT,
      message: 'email and password are required',
    });
  }

  try {
    const result = await callExpressHandler(
      accountController.createStudent,
      accountController,
      { body: { email, password, firstName, lastName } }
    );

    const data = result.data || {};
    callback(null, {
      success: true,
      error: '',
      token: data.token || '',
      userId: String(data.user?.id || ''),
      email: data.user?.email || '',
      role: data.user?.role || 'student',
      firstName: data.user?.firstName || '',
      lastName: data.user?.lastName || '',
    });
  } catch (err) {
    console.error('gRPC CreateStudent error:', err);

    if (err.httpStatus === 409) {
      return callback({
        code: grpc.status.ALREADY_EXISTS,
        message: err.payload?.error || 'User already exists',
      });
    }

    if (err.httpStatus === 400) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: err.payload?.error || 'Invalid request',
      });
    }

    return callback({
      code: grpc.status.INTERNAL,
      message: 'Failed to create student',
    });
  }
}

function startGrpcServer() {
  const server = new grpc.Server();

  server.addService(accountProto.AccountService.service, {
    CreateStudent: createStudent,
  });

  const GRPC_PORT = process.env.GRPC_PORT || '50055';

  server.bindAsync(
    '0.0.0.0:' + GRPC_PORT,
    grpc.ServerCredentials.createInsecure(),
    (err, boundPort) => {
      if (err) {
        console.error('Failed to bind account gRPC server:', err);
        return;
      }
      console.log(`Account gRPC server running on port ${boundPort}`);
      server.start();
    }
  );

  return server;
}

module.exports = { startGrpcServer };
