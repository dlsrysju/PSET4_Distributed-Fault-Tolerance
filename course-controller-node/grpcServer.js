// course-controller-node/grpcServer.js
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const PROTO_PATH = path.join(__dirname, "..", "protos", "course.proto");
const pkgDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const courseProto = grpc.loadPackageDefinition(pkgDef).course;

// Import your existing controllers or models
const courseController = require("./controllers/courseController");
const enrollmentController = require("./controllers/enrollmentController");

// Helper to adapt Express-style controllers if you have them
function wrapExpressHandler(fn) {
  return (params) =>
    new Promise((resolve, reject) => {
      const req = { body: params, params, query: params };
      const res = {
        json: (data) => resolve(data),
        status: (code) => ({
          json: (data) => reject({ code, data }),
        }),
      };
      fn(req, res);
    });
}

async function listOpenCourses(call, callback) {
  try {
    // If you already have a function to list courses, call it here.
    // Example if you have model methods:
    const courses = await courseController.getOpenCourses(); // adjust to your code
    callback(null, { courses });
  } catch (err) {
    console.error("ListOpenCourses error:", err);
    callback(err);
  }
}

async function enroll(call, callback) {
  const { userId, courseId } = call.request;
  try {
    // Adjust this to your real logic
    const enrollment = await enrollmentController.enrollStudent(userId, courseId);
    callback(null, {
      enrollmentId: String(enrollment.id),
      course: enrollment.course, // make sure this matches Course message shape
    });
  } catch (err) {
    console.error("Enroll error:", err);
    callback(err);
  }
}

function startGrpcServer() {
  const server = new grpc.Server();

  server.addService(courseProto.CourseService.service, {
    ListOpenCourses: listOpenCourses,
    Enroll: enroll,
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
