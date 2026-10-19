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
| Migración UUID sobre copia de la base de producción | **OK** — `0010_uuid_identificadores.js` aplicada sobre `lineabar_uuid_test` (copia de `lineabar`): conteos preservados (`clienti` 3, `macchine` 3, `manutenzioni` 7, `boletas` 4, `utenti` 1, `calendario` 3), `id` en `char(36)`, 35 claves foráneas y los 3 índices dependientes recreados. |
| Suite de integración contra la copia migrada | **OK — 14/14** pruebas, incluidas cookie `HttpOnly`, CSRF, CRUD, campo, calendario, boleta, scontrino, roles, reportes y defensas. | |

### Vulnerabilidades corregidas

Antes de la corrección, `npm audit` reportaba:

- `backend`: `proxy-addr` 2.0.7 (critical, suplantación de IP en subred de
  confianza) e `ip-address` ≤ 10.7.0 (moderate).
- `frontend`: `source-map-js` 1.2.1 (high).

`npm audit fix` actualizó `proxy-addr` a 2.0.8, `ip-address` a 10.7.4 y
`source-map-js` a 1.2.2. Verificado: **0 vulnerabilidades** en ambos proyectos.

## 2. Cambios verificados en esta sesión

- `backend/src/configuracion/entorno.js`: validación *fail-closed* del entorno,
  `TRUST_PROXY_HOPS` y cookies.
- `backend/src/intermedios/cookies.js` y `sesion.js`: sesión en cookie `HttpOnly`,
  CSRF en mutaciones y `Bearer` solo para desarrollo/tests.
- `frontend/src/compartido/api/cliente.js`: sin `localStorage`, `credentials` y
  cabecera CSRF.
- `backend/src/base-datos/migraciones/0010_uuid_identificadores.js`: UUID en todas
  las claves primarias y foráneas.
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

1. **Suite de integración local**: no había MariaDB local en `127.0.0.1:3308`.
   Se ejecutó contra una **copia de la base de producción en el VPS** y pasó
   **14/14**; el job `integracion` de CI la repetirá en cada PR.
2. **Arranque con Docker Compose local**: no se ejecutó; el despliegue real se
   validó en el VPS.
3. **Verificación visual** en navegador/iPhone: pendiente tras el despliegue. Los
   cambios de accesibilidad y CSP no se validaron sobre la aplicación renderizada.
4. **`trust proxy` en el VPS**: el valor `2` corresponde a dos saltos (Nginx del
   host + Nginx del contenedor); se verificará con tráfico real tras el despliegue.
5. **CSP con Google Fonts**: la política permite `fonts.googleapis.com` y
   `fonts.gstatic.com`; la comprobación en navegador real queda pendiente.

## 3bis. Datos persistidos en la base de producción (2026-10-19)

Inspección de solo lectura sobre `lineabar` antes de la migración:

| Tabla | Filas | Observación |
| --- | ---: | --- |
| `clienti` | 3 | Datos de demostración. |
| `macchine` | 3 | Datos de demostración. |
| `manutenzioni` | 7 | 6 de demostración + 1 registro de prueba. |
| `boletas` | 4 | 3 de demostración + 1 registro de prueba. |
| `utenti` | 1 | Administrador `dev01`. |
| `ruoli` | 2 | Administrador y técnico. |
| `fornitori` | 6 | Maestros reales. |
| `marche` | 5 | Maestros reales. |
| `pezzi` | 14 | Maestros reales. |
| `tipi_caratteristiche` | 6 | Maestros reales. |
| `calendario_manutenzioni_macchine` | 3 | Demostración. |
| `attivita` | 2 | Demostración. |
| `scontrini` | **0** | Sin imágenes persistidas. |
| `sesiones_refresco` | 5 | Sesiones de prueba. |
| `parametros` | 4 | Configuración operativa. |

No hay datos de clientes reales identificables: la instalación contiene
principalmente la semilla de demostración y algunos registros de prueba. La
inspección se puede repetir con `cd backend && npm run datos:estado`.

## 3ter. Despliegue en producción (2026-10-19)

Despliegue mediante `infraestructura/despliegue/actualizar.sh` sobre
`/home/deploy/lineabar`, con copia previa de la base en
`backups/lineabar-pre-uuid-*.sql.gz`.

| Comprobación | Resultado |
| --- | --- |
| `https://vps-5586828-x.dattaweb.com/lineabar/` | **200** con TLS. |
| Migraciones | `0010_uuid_identificadores.js` y `0011_fk_manutenzione_chiusura_uuid.sql` aplicadas. |
| Identificadores | **0** columnas `id` que no sean `char(36)`; **0** columnas `fk_*`/`utente_*` numéricas. |
| Claves foráneas | **36** FKs tras añadir `fk_attivita_manutenzione_chiusura`. |
| Datos preservados | `clienti` 3, `macchine` 3, `manutenzioni` 7, `boletas` 4, `utenti` 1, `scontrini` 0. |
| Login | **200**; `utente.codigo_usuario=dev01`, `csrf` presente y sin tokens en el cuerpo. |
| Cookies | `lineabar_sesion` y `lineabar_refresco` `HttpOnly; Secure; SameSite=Strict`; sin cookie CSRF legible. |
| CSRF | `PUT` sin cabecera → **403**; con `X-CSRF-Token` → **200**. |
| Cabeceras del SPA | CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy y Permissions-Policy presentes. |
| Contenedores | `inicializacion` `Exited (0)`; `backend` y `frontend` sanos; `mariadb` sano. |
| Imagen backend | 377 MB, usuario `node`, rootfs de solo lectura, `no-new-privileges`, **sin `npm`**. |
| Imagen frontend | 74,1 MB, solo Nginx y estáticos. |

**Pendiente `[NV]`:** revisión visual en navegador/iPhone real y prueba de la
página con lector de pantalla. El despliegue no se declara visualmente aprobado
por esta comprobación técnica.

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
