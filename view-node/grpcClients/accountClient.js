// view-node/grpcClients/accountClient.js
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const PROTO_PATH = path.join(__dirname, "../../protos/account.proto");

const pkgDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const accountProto = grpc.loadPackageDefinition(pkgDef).account;

const ACCOUNT_SERVICE_ADDR =
  process.env.ACCOUNT_SERVICE_ADDR || "localhost:50055";

const client = new accountProto.AccountService(
  ACCOUNT_SERVICE_ADDR,
  grpc.credentials.createInsecure()
);

module.exports = client;
