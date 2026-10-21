# 06 — Operaciones

> **Estado: GUÍA VERIFICADA PARCIALMENTE (revisión 2026-10-21).** Los comandos
> existen en el repositorio `[V]`; el despliegue en el VPS no se ejecutó en esta
> sesión `[NV]`. Cualquier cambio en el VPS requiere aprobación explícita.

## 1. Arranque local con Docker

```bash
cp .env.example .env    # reemplazar cada valor; dejar LINEABAR_CARGAR_DEMO=1
docker compose up --build -d
docker compose logs -f
docker compose down      # conserva el volumen lineabar_mariadb
```

Publica `http://localhost:8091/lineabar/` (solo loopback). `docker compose down -v`
elimina los datos de forma deliberada: **no se ejecuta**.

## 2. Arranque local sin Docker

Con MariaDB alcanzable (por ejemplo el contenedor en `LINEABAR_DB_PORT=3308`):

```bash
cd backend
cp .env.example .env
# DB_PORT=3308, MARIADB_DATABASE, LINEABAR_DB_USER, LINEABAR_DB_PASSWORD, JWT_SECRET
npm install
npm run migraciones && npm run sembrar
npm run dev
```

En otra terminal: `cd frontend && npm install && npm run dev` (Vite en
`http://localhost:5173/lineabar/`, proxy a `http://localhost:3001`).

## 3. Variables de entorno

- `NODE_ENV=production` activa la validación estricta: `JWT_SECRET` ≥ 32 caracteres
  sin plantilla, `LINEABAR_DB_USER/PASSWORD`, `MARIADB_DATABASE`, orígenes de CORS
  válidos y `LINEABAR_ADMIN_PASSWORD` sin valor de ejemplo al sembrar.
- `TRUST_PROXY_HOPS`: saltos de proxy de confianza. `2` en producción (Nginx del
  host + Nginx del contenedor), `0` en local.
- `CORS_ORIGIN`: lista separada por comas; solo origen, sin ruta ni credenciales.
- `LINEABAR_OCR_*`: proveedor (`tesseract` por defecto), idioma, endpoint opcional,
  modelo, tiempo límite y tamaño máximo.
- `LINEABAR_ACCESO_MINUTOS` (10) y `LINEABAR_REFRESCO_DIAS` (30).
- `LINEABAR_CARGAR_ABRUZZO=1` carga los 15 bares de prueba con Google Maps; en
  una instalación real debe quedar en `0`.
- `LINEABAR_AI_ENDPOINT`, `LINEABAR_AI_API_KEY`, `LINEABAR_AI_MODELO` y
  `LINEABAR_AI_REASONING_EFFORT`: endpoint compatible con Chat Completions, clave
  **solo en el servidor**, modelo base (`deepseek-v4.1-flash`) y esfuerzo
  (`low`/`high`/`max`). Si
  faltan, la programación usa el fallback local; la clave nunca se imprime ni se
  envía al navegador.

Las plantillas están en `.env.example` (raíz, usado por Compose) y
`backend/.env.example` (desarrollo local). **Nunca** se versiona `.env` ni se
imprime su contenido.

## 4. Migraciones y semillas

```bash
cd backend
npm run migraciones   # aplica pendientes y registra en migraciones_aplicadas
npm run sembrar       # sincroniza maestros y administrador; demo con LINEABAR_CARGAR_DEMO=1; Abruzzo con LINEABAR_CARGAR_ABRUZZO=1
```

Reglas: no modificar una migración aplicada; añadir el número siguiente; el runner
se detiene al primer error y es idempotente.

## 5. Despliegue en el VPS

1. El repositorio está clonado en `/home/deploy/lineabar`; `.env` vive allí con
   permisos `600` y no se sobrescribe.
2. Nginx del host: vhost compartido en `/etc/nginx/codex-sites/ag-lineabar.conf`.
   Para alinearlo: `./infraestructura/despliegue/actualizar-nginx.sh` (valida con
   `nginx -t` y restaura el archivo anterior si falla).
3. Código: `./infraestructura/despliegue/actualizar.sh` (fetch + `pull --ff-only`
   de `main` + `docker compose up --build -d`).
4. Verificar `docker compose ps`, los logs de los servicios tocados y
   `https://vps-5586828-x.dattaweb.com/lineabar/`.

Antes de desplegar: revisar migraciones pendientes, secretos propios de producción,
cabeceras del borde y plan de reversión. No eliminar volúmenes ni ejecutar
`docker compose down -v`.

## 6. Copia de seguridad y reversión

- **Antes de migrar:** copia lógica del volumen `lineabar_mariadb`
  (`mariadb-dump` contra `127.0.0.1:3308` con el usuario de migraciones).
- **Reversión de código:** `git revert` del commit desplegado y nuevo
  `./infraestructura/despliegue/actualizar.sh`.
- **Reversión de esquema:** una migración aplicada no se deshace sola; restaurar
  la copia lógica. Las migraciones se escriben aditivas siempre que sea posible.
- **Estado `[NV]`:** no hay copia automatizada ni restauración probada (`D-07`).

## 7. Diagnóstico rápido

| Síntoma | Comprobación |
| --- | --- |
| El SPA no carga | `docker compose ps`, logs de `frontend`, `curl -I http://127.0.0.1:8091/lineabar/`. |
| La API responde 5xx | Logs de `backend`; validar `.env` (nombres, no valores). |
| Rate limiting bloquea a todos | Revisar `TRUST_PROXY_HOPS` frente a la topología real. |
| Migración falla | Logs de `inicializacion`; nunca editar la migración ya aplicada. |
| OCR lento | Cola de Tesseract, `LINEABAR_OCR_TIEMPO_LIMITE_MS` y `limiteOcr`. |
