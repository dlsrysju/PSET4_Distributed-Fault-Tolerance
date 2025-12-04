FROM node:18-alpine
WORKDIR /app

# Copy package and install
COPY view-node/package*.json ./
RUN npm ci --only=production

# Copy service source
COPY view-node/ ./

# Copy protos (so grpc clients can load them)
COPY protos/ /protos/

ENV NODE_ENV=production
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --retries=3 CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "server.js"]