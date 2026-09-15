FROM node:22-alpine AS dependencias
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=dependencias /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
EXPOSE 3001
CMD ["node", "src/server.js"]
