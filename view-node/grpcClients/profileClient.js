// view-node/grpcClients/profileClient.js
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const PROTO_PATH = path.join(__dirname, "../../protos/profile.proto");

const pkgDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const profileProto = grpc.loadPackageDefinition(pkgDef).profile;

const PROFILE_SERVICE_ADDR =
  process.env.PROFILE_SERVICE_ADDR || "localhost:50054";

const client = new profileProto.ProfileService(
  PROFILE_SERVICE_ADDR,
  grpc.credentials.createInsecure()
);

module.exports = client;
