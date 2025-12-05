FROM node:18-alpine
WORKDIR /app

COPY account-controller-node/package*.json ./
RUN npm install --omit=dev

COPY account-controller-node/ ./
COPY protos/ /protos/

ENV NODE_ENV=production
EXPOSE 3000
RUN apk add --no-cache curl
HEALTHCHECK --interval=10s --timeout=3s --retries=3 CMD curl -fsS http://localhost:3000/health || exit 1
CMD ["node", "server.js"]
