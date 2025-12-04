// profile-controller-node/grpcServer.js
// gRPC wrapper around the profile controller

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const ProfileController = require('./controllers/profileController');

const PROTO_PATH = path.join(__dirname, '..', 'protos', 'profile.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const profileProto = grpc.loadPackageDefinition(packageDefinition).profile;
const profileController = new ProfileController();

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

async function getProfile(call, callback) {
  const { userId } = call.request;

  if (!userId) {
    return callback({
      code: grpc.status.INVALID_ARGUMENT,
      message: 'userId is required',
    });
  }

  try {
    const result = await callExpressHandler(
      profileController.getProfile,
      profileController,
      {
        user: { userId },
      }
    );

    const user = result.data?.user || null;

    callback(null, {
      success: true,
      user,
      error: '',
    });
  } catch (err) {
    console.error('gRPC GetProfile error:', err);

    if (err.httpStatus === 404) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: err.payload?.error || 'User not found',
      });
    }

    if (err.httpStatus === 401) {
      return callback({
        code: grpc.status.UNAUTHENTICATED,
        message: err.payload?.error || 'Unauthorized',
      });
    }

    return callback({
      code: grpc.status.INTERNAL,
      message: 'Failed to fetch profile',
    });
  }
}

async function updateProfile(call, callback) {
  const { userId, email, password, firstName, lastName } = call.request;

  if (!userId) {
    return callback({
      code: grpc.status.INVALID_ARGUMENT,
      message: 'userId is required',
    });
  }

  try {
    const result = await callExpressHandler(
      profileController.updateProfile,
      profileController,
      {
        body: { email, password, firstName, lastName },
        user: { userId },
      }
    );

    const data = result.data || {};

    callback(null, {
      success: true,
      user: data.user || null,
      token: data.token || '',
      error: '',
    });
  } catch (err) {
    console.error('gRPC UpdateProfile error:', err);

    if (err.httpStatus === 400) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: err.payload?.error || 'Invalid profile data',
      });
    }

    if (err.httpStatus === 401) {
      return callback({
        code: grpc.status.UNAUTHENTICATED,
        message: err.payload?.error || 'Unauthorized',
      });
    }

    if (err.httpStatus === 404) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: err.payload?.error || 'User not found',
      });
    }

    if (err.httpStatus === 409) {
      return callback({
        code: grpc.status.ALREADY_EXISTS,
        message: err.payload?.error || 'Email already in use',
      });
    }

    return callback({
      code: grpc.status.INTERNAL,
      message: 'Failed to update profile',
    });
  }
}

function startGrpcServer() {
  const server = new grpc.Server();

  server.addService(profileProto.ProfileService.service, {
    GetProfile: getProfile,
    UpdateProfile: updateProfile,
  });

  const GRPC_PORT = process.env.GRPC_PORT || '50054';

  server.bindAsync(
    '0.0.0.0:' + GRPC_PORT,
    grpc.ServerCredentials.createInsecure(),
    (err, boundPort) => {
      if (err) {
        console.error('Failed to bind profile gRPC server:', err);
        return;
      }
      console.log(`Profile gRPC server running on port ${boundPort}`);
      server.start();
    }
  );

  return server;
}

module.exports = { startGrpcServer };
