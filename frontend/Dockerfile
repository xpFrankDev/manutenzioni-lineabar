FROM node:22-alpine AS construccion
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY infraestructura/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=construccion /app/dist /usr/share/nginx/html/lineabar
EXPOSE 80
