# 05 — Verificación

> **Estado: EVIDENCIA `[V]` de la sesión del 2026-10-19.** Registra comandos y
> resultados **reales**. Lo no ejecutado se declara como `[NV]`; no se presenta
> como aprobado.

## 1. Resultados de esta sesión

| Comando | Resultado real |
| --- | --- |
| `cd backend && npm run test:unidad` | **OK — 11/11** pruebas (código 0). |
| `cd backend && npm run verificar` | **OK** — sintaxis correcta en **38** archivos (código 0). |
| `cd frontend && npm test` | **OK — 7/7** pruebas (código 0). |
| `cd frontend && npm run build` | **OK** — build de producción Vite (código 0). |
| `cd backend && npm audit --omit=dev` | **OK — 0 vulnerabilidades** tras `npm audit fix`. |
| `cd frontend && npm audit --omit=dev` | **OK — 0 vulnerabilidades** tras `npm audit fix`. |

### Vulnerabilidades corregidas

Antes de la corrección, `npm audit` reportaba:

- `backend`: `proxy-addr` 2.0.7 (critical, suplantación de IP en subred de
  confianza) e `ip-address` ≤ 10.7.0 (moderate).
- `frontend`: `source-map-js` 1.2.1 (high).

`npm audit fix` actualizó `proxy-addr` a 2.0.8, `ip-address` a 10.7.4 y
`source-map-js` a 1.2.2. Verificado: **0 vulnerabilidades** en ambos proyectos.

## 2. Cambios verificados en esta sesión

- `backend/src/configuracion/entorno.js`: validación *fail-closed* del entorno y
  `TRUST_PROXY_HOPS`.
- `backend/src/app.js`: `trust proxy` desde entorno y `x-powered-by` desactivado.
- `backend/src/intermedios/limite.js`: `limiteOcr` (30/15 min).
- `backend/src/modulos/autenticacion/servicio.js`: comparación con hash ficticio.
- `backend/src/modulos/reportes/servicio.js`: neutralización de fórmulas en CSV.
- `frontend/nginx.conf`: CSP, HSTS, `X-Frame-Options: DENY`, Permissions-Policy y
  `client_max_body_size 12m`.
- `frontend/public/theme-init.js` + `frontend/index.html`: tema sin script inline.
  Vite emite un aviso porque el script es clásico y no se bundlea; es intencional:
  debe ejecutarse antes del bundle para evitar el destello de tema.
- Accesibilidad: `role="dialog"`, `aria-modal` y etiquetas en botones de cierre e
  iconos de configuración.
- Prueba nueva de paridad i18n (`es` cubre todas las claves de `it`).

## 3. Lo no verificado en esta sesión `[NV]`

1. **Suite de integración** (`cd backend && npm test`): requiere MariaDB en
   `127.0.0.1:3308`; no había servicio local escuchando en los puertos 3308,
   3001, 5173 ni 8091. Se añadió el job `integracion` de CI para ejecutarla contra
   MariaDB real.
2. **Arranque con Docker Compose**: no se ejecutó.
3. **Verificación visual** en navegador/iPhone: no se repitió. Los cambios de
   accesibilidad y CSP no se validaron sobre la aplicación renderizada.
4. **`trust proxy` en el VPS**: el valor `2` corresponde a dos saltos (Nginx del
   host + Nginx del contenedor). La comprobación con tráfico real queda para el
   despliegue.
5. **CSP con Google Fonts**: la política permite `fonts.googleapis.com` y
   `fonts.gstatic.com`; falta comprobar en navegador real que no bloquea ningún
   recurso legítimo.

## 4. Suites existentes

### Backend

| Suite | Alcance | Requiere base |
| --- | --- | --- |
| `npm run test:unidad` | Dominio: calendario, códigos, totales, OCR, CSV e i18n de servidor. | No |
| `npm run verificar` | Sintaxis de todos los archivos de `src/`. | No |
| `npm test` | Unidad + integración HTTP (acceso, refresco, maestros, campo, calendario, boleta, scontrino, roles, reportes y defensas). | Sí (`lineabar_test`) |

`tests/preparar-base.js` recrea `lineabar_test` y rechaza cualquier base cuyo
nombre no empiece por `lineabar_test`.

### Frontend

| Suite | Alcance | Requiere navegador |
| --- | --- | --- |
| `npm test` | Dominio (fechas, moneda, mano de obra, i18n) y render en servidor de las pantallas. | No |

## 5. Verificación pendiente de compromiso

Antes de dar por cerrada una iteración con cambio visual o de red:

1. `npm test` completo en backend contra `lineabar_test`.
2. `npm run build` en frontend.
3. Arranque local con `docker compose up --build -d` y comprobación de `/lineabar/`.
4. Revisión visual en móvil emulado (390 px) y tema claro/oscuro.
5. En el VPS: TLS, `200` final y cabeceras del borde.
