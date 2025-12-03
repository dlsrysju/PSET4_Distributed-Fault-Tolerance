// course-controller-node/grpcServer.js
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

// Load proto
const PROTO_PATH = path.join(__dirname, "..", "protos", "course.proto");
const pkgDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const courseProto = grpc.loadPackageDefinition(pkgDef).course;

// Existing controllers (classes)
const CourseController = require("./controllers/courseController");
const EnrollmentController = require("./controllers/enrollmentController");

// Instantiate controllers
const courseController = new CourseController();
const enrollmentController = new EnrollmentController();

/**
 * Helper to call an Express-style controller method (req, res)
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
        // If controller responded with error status, reject
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
 * gRPC: ListOpenCourses
 * Uses CourseController.getAllCourses (no auth/params needed).
 */
async function listOpenCourses(call, callback) {
  try {
    const result = await callExpressHandler(
      courseController.getAllCourses,
      courseController,
      {}
    );

    // HTTP controller returns: { success: true, data: courses }
    const courses = result.data || [];

    console.log("gRPC ListOpenCourses fetched courses:", courses);

    callback(null, {
      courses, // field names should match Course message in course.proto
    });
  } catch (err) {
    console.error("ListOpenCourses error:", err);

    return callback({
      code: grpc.status.INTERNAL,
      message: "Failed to fetch courses",
    });
  }
}

/**
 * gRPC: Enroll
 * Request: { userId, courseId }
 * Adapts to EnrollmentController.enrollStudent which expects:
 *   req.user.userId, req.user.role === 'student', req.body.courseId
 */
async function enroll(call, callback) {
  const { userId, courseId } = call.request;

  if (!userId || !courseId) {
    return callback({
      code: grpc.status.INVALID_ARGUMENT,
      message: "userId and courseId are required",
    });
  }

  try {
    const result = await callExpressHandler(
      enrollmentController.enrollStudent,
      enrollmentController,
      {
        body: { courseId },
        user: {
          userId,        // matches EnrollmentController usage
          role: "student",
        },
      }
    );

    // HTTP controller returns:
    // { success: true, data: { enrollmentId, enrolledAt } }
    const data = result.data || {};

    callback(null, {
      enrollmentId: String(data.enrollmentId || ""),
      enrolledAt: data.enrolledAt || "",
    });
  } catch (err) {
    console.error("Enroll error:", err);

    if (err.httpStatus === 400) {
      return callback({
        code: grpc.status.FAILED_PRECONDITION,
        message: err.message || err.payload?.error || "Enrollment invalid",
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
        message: err.payload?.error || "Course not found",
      });
    }

    if (err.httpStatus === 409) {
      return callback({
        code: grpc.status.ALREADY_EXISTS,
        message: err.payload?.error || "Already enrolled",
      });
    }

    return callback({
      code: grpc.status.INTERNAL,
      message: "Failed to enroll in course grpc server",
    });
  }
}

/**
 * Optional gRPC: ListEnrollmentsByStudent
 * Uses EnrollmentController.getMyEnrollments.
 * Request: { userId }
 */
async function listEnrollmentsByStudent(call, callback) {
  const { userId } = call.request;

  try {
    const result = await callExpressHandler(
      enrollmentController.getMyEnrollments,
      enrollmentController,
      {
        user: { userId, role: "student" },
      }
    );

    const rows = result.data || [];

    const enrollments = rows.map((row) => ({
      enrollment_id: String(row.enrollment_id),
      course_id: String(row.course_id),
      code: row.code,
      title: row.title,
      description: row.description,
      faculty_first_name: row.faculty_first_name,
      faculty_last_name: row.faculty_last_name,
      enrolled_at: row.enrolled_at, // ISO string from DB
    }));

    callback(null, { enrollments });
  } catch (err) {
    console.error("ListEnrollmentsByStudent error:", err);
    // ...error handling...
  }
}

function startGrpcServer() {
  const server = new grpc.Server();

  server.addService(courseProto.CourseService.service, {
    ListOpenCourses: listOpenCourses,
    Enroll: enroll,
    ListEnrollmentsByStudent: listEnrollmentsByStudent,
  });

  const port = process.env.GRPC_PORT || "50052";

  server.bindAsync(
    "0.0.0.0:" + port,
    grpc.ServerCredentials.createInsecure(),
    (err, boundPort) => {
      if (err) throw err;
      console.log("Course gRPC server listening on", boundPort);
      server.start();
    }
  );

  return server;
}

module.exports = { startGrpcServer };
