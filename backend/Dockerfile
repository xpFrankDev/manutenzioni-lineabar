# Etapa de dependencias: solo librerías de ejecución.
FROM node:22-alpine AS dependencias
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Imagen final: sirve la API y también ejecuta migraciones y semilla, por lo que
# conserva src/, scripts/ y package.json.
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=dependencias /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY scripts ./scripts
EXPOSE 3001
CMD ["node", "src/servidor.js"]
