# Etapa de dependencias: solo librerías de ejecución, sin devDependencies.
FROM node:22-alpine AS dependencias
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund \
    && npm cache clean --force

# Imagen final: API, migraciones y semilla. No incluye tests, scripts de
# desarrollo ni npm; las migraciones se ejecutan directamente con node.
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=dependencias /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /opt/yarn*
USER node
EXPOSE 3001
CMD ["node", "src/servidor.js"]
