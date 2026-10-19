# Etapa de construcción: Vite y dependencias de desarrollo solo viven aquí.
FROM node:22-alpine AS construccion
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY . .
RUN npm run build

# Imagen final: solo Nginx y los estáticos compilados.
FROM nginx:1.27-alpine AS produccion
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=construccion /app/dist /usr/share/nginx/html/lineabar
EXPOSE 80
