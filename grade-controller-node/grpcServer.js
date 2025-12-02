// grade-controller-node/grpcServer.js
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const PROTO_PATH = path.join(__dirname, "..", "protos", "grade.proto");
const pkgDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const gradeProto = grpc.loadPackageDefinition(pkgDef).grade;

// Import your existing model/controller
const gradeController = require("./controllers/gradeController");

async function listGrades(call, callback) {
  const { userId } = call.request;
  try {
    const grades = await gradeController.getGradesForStudent(userId); // adjust
    callback(null, { grades });
  } catch (err) {
    console.error("ListGrades error:", err);
    callback(err);
  }
}

async function uploadGrade(call, callback) {
  const { studentId, courseId, facultyId, grade } = call.request;
  try {
    const record = await gradeController.saveGrade({
      studentId,
      courseId,
      facultyId,
      grade,
    }); // adjust to your code

    callback(null, { record });
  } catch (err) {
    console.error("UploadGrade error:", err);
    callback(err);
  }
}

function startGrpcServer() {
  const server = new grpc.Server();

  server.addService(gradeProto.GradeService.service, {
    ListGrades: listGrades,
    UploadGrade: uploadGrade,
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
