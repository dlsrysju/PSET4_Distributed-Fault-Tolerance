// view-node/grpcClients/courseClient.js
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const PROTO_PATH = path.join(__dirname, "../../protos/course.proto");

const pkgDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const courseProto = grpc.loadPackageDefinition(pkgDef).course;

// IP:PORT of the course-controller-node gRPC server
const COURSE_SERVICE_ADDR =
  process.env.COURSE_SERVICE_ADDR || "localhost:50052";

const client = new courseProto.CourseService(
  COURSE_SERVICE_ADDR,
  grpc.credentials.createInsecure()
);

module.exports = client;