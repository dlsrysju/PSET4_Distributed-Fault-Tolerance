// ========== grpcServer.js ==========
// gRPC server for Grade Controller Node

const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

// Load proto
const PROTO_PATH = path.join(__dirname, "..", "protos", "grade.proto");
const pkgDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const gradeProto = grpc.loadPackageDefinition(pkgDef).grade;

// Import and instantiate your existing controller (class)
const GradeController = require("./controllers/gradeController");
const gradeController = new GradeController();

/**
 * Helper: call an Express-style controller method (req, res)
 * and adapt it to a Promise for gRPC.
 */
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
        // If controller responded with an error status, reject
        if (this._status >= 400) {
          const err = new Error(payload.error || "Request failed");
          err.httpStatus = this._status;
          err.payload = payload;
          return reject(err);
        }
        return resolve(payload);
      },
    };

    try {
      // Bind correct `this` (controller instance)
      handler.call(controller, req, res);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * gRPC: ListGrades
 * Uses GradeController.getMyGrades
 * Request is expected to have: { userId, role? }
 * - role defaults to "student" (this is the "My Grades" view)
 */
async function listGrades(call, callback) {
  const { userId, role } = call.request;

  if (!userId) {
    return callback({
      code: grpc.status.INVALID_ARGUMENT,
      message: "userId is required",
    });
  }

  try {
    const result = await callExpressHandler(
      gradeController.getMyGrades,
      gradeController,
      {
        user: {
          userId: parseInt(userId, 10),
          role: role || "student",
        },
      }
    );

    // Controller returns: { success: true, data: grades }
    const grades = result.data || [];

    callback(null, { grades });
  } catch (err) {
    console.error("ListGrades error:", err);

    if (err.httpStatus === 403) {
      return callback({
        code: grpc.status.PERMISSION_DENIED,
        message: err.payload?.error || "Permission denied",
      });
    }

    return callback({
      code: grpc.status.INTERNAL,
      message: "Failed to fetch grades",
    });
  }
}

/**
 * gRPC: UploadGrade
 * Uses GradeController.uploadGrade
 * Request is expected to have:
 *   { facultyId, enrollmentId, grade, remarks }
 */
async function uploadGrade(call, callback) {
  const { facultyId, enrollmentId, grade, remarks } = call.request;

  if (!facultyId || !enrollmentId || !grade) {
    return callback({
      code: grpc.status.INVALID_ARGUMENT,
      message: "facultyId, enrollmentId, and grade are required",
    });
  }

  try {
    const result = await callExpressHandler(
      gradeController.uploadGrade,
      gradeController,
      {
        body: { enrollmentId, grade, remarks },
        user: {
          userId: parseInt(facultyId, 10),
          role: "faculty",
        },
      }
    );

    // Controller returns: { success: true, data: result }
    const record = result.data;

    callback(null, { record });
  } catch (err) {
    console.error("UploadGrade error:", err);

    if (err.httpStatus === 400) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: err.payload?.error || "Invalid grade upload data",
      });
    }

    if (err.httpStatus === 403) {
      return callback({
        code: grpc.status.PERMISSION_DENIED,
        message: err.payload?.error || "Permission denied",
      });
    }

    if (err.httpStatus === 404) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: err.payload?.error || "Enrollment not found",
      });
    }

    return callback({
      code: grpc.status.INTERNAL,
      message: "Failed to upload grade",
    });
  }
}

async function listEnrollmentsWithGrades(call, callback) {
  const { facultyId } = call.request;

  if (!facultyId) {
    return callback({
      code: grpc.status.INVALID_ARGUMENT,
      message: "facultyId is required",
    });
  }

  try {
    const result = await callExpressHandler(
      gradeController.getFacultyEnrollments,
      gradeController,
      {
        user: {
          userId: parseInt(facultyId, 10),
          role: "faculty",
        },
      }
    );

    // Your controller returns: { success: true, data: enrollments }
    const enrollments = result.data || [];

    callback(null, { enrollments });
  } catch (err) {
    console.error("ListEnrollmentsWithGrades error:", err);

    if (err.httpStatus === 403) {
      return callback({
        code: grpc.status.PERMISSION_DENIED,
        message: err.payload?.error || "Permission denied",
      });
    }

    return callback({
      code: grpc.status.INTERNAL,
      message: "Failed to fetch enrollments",
    });
  }
}


function startGrpcServer() {
  const server = new grpc.Server();

  server.addService(gradeProto.GradeService.service, {
    ListGrades: listGrades,
    UploadGrade: uploadGrade,
    ListEnrollmentsWithGrades: listEnrollmentsWithGrades,
  });

  const port = process.env.GRPC_PORT || "50053";

  server.bindAsync(
    "0.0.0.0:" + port,
    grpc.ServerCredentials.createInsecure(),
    (err, boundPort) => {
      if (err) throw err;
      console.log("Grade gRPC server listening on", boundPort);
      server.start();
    }
  );

  return server;
}

module.exports = { startGrpcServer };