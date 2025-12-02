// view-node/grpcClients/authClient.js
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const PROTO_PATH = path.join(__dirname, "../../protos/auth.proto");

const pkgDef = protoLoader.loadSync(PROTO_PATH, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
const authProto = grpc.loadPackageDefinition(pkgDef).auth;

const AUTH_SERVICE_ADDR = process.env.AUTH_SERVICE_ADDR || "localhost:50051";

const client = new authProto.AuthService(
  AUTH_SERVICE_ADDR,
  grpc.credentials.createInsecure()
);

module.exports = client;
