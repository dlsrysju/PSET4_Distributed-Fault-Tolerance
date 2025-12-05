FROM node:18-alpine
WORKDIR /app

# Copy service package metadata and install dependencies
COPY profile-controller-node/package*.json ./
RUN npm install --omit=dev

# Copy service source
COPY profile-controller-node/ ./

# Copy protos so gRPC server can load them
COPY protos/ /protos/

ENV NODE_ENV=production
EXPOSE 3000
RUN apk add --no-cache curl
HEALTHCHECK --interval=10s --timeout=3s --retries=3 CMD curl -fsS http://localhost:3000/health || exit 1
CMD ["node", "server.js"]
