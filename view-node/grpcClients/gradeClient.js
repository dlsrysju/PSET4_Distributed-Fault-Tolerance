// view-node/grpcClients/gradeClient.js
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const PROTO_PATH = path.join(__dirname, "../../protos/grade.proto");

const pkgDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const gradeProto = grpc.loadPackageDefinition(pkgDef).grade;

// IP:PORT of the grade-controller-node gRPC server
const GRADE_SERVICE_ADDR =
  process.env.GRADE_SERVICE_ADDR || "localhost:50053";

const client = new gradeProto.GradeService(
  GRADE_SERVICE_ADDR,
  grpc.credentials.createInsecure()
);

module.exports = client;