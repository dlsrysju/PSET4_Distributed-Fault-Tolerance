FROM node:18-alpine
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

ENV NODE_ENV=production
EXPOSE 3003
CMD ["node", "server.js"]