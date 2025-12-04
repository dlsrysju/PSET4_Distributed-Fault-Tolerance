FROM node:18-alpine
WORKDIR /app

# Copy service package and install dependencies
COPY auth-controller-node/package*.json ./
RUN npm ci --only=production

# Copy service source
COPY auth-controller-node/ ./

# Copy protos into image so runtime can always access them
COPY protos/ /protos/

ENV NODE_ENV=production
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --retries=3 CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "server.js"]