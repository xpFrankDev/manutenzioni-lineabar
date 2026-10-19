# 04 — Seguridad

> **Estado: NORMATIVO DE SEGURIDAD (revisión 2026-10-19).** Documenta el estado
> **real** de los controles, los hallazgos con severidad y el plan de remediación.
> No autoriza despliegue ni cambios en el VPS. Si contradice al código, manda el
> código. Referencia de método: `proyecto-trading-saas/docs/26`.

## 1. Alcance y postura

El proyecto es una API privada detrás del Nginx compartido, con un SPA que consume
la API bajo el mismo origen `/lineabar/api`. No hay multi-tenant: el límite de
seguridad es el **rol** (administrador/técnico) y la **propiedad** del registro.

Postura vigente: endurecimiento razonable para uso interno, con dos deudas
**críticas** declaradas: sesión en `localStorage` (`D-01`) y el endurecimiento del
borde (`D-02`). Las dependencias con vulnerabilidad conocida se corrigieron el
2026-10-19 (`05-verificacion.md`).

## 2. Controles implementados `[V]`

### 2.1 Backend

| Control | Evidencia |
| --- | --- |
| Cabeceras de seguridad (`helmet`) y `x-powered-by` desactivado | `backend/src/app.js` (`helmet()`, `disable('x-powered-by')`) |
| CORS con lista de orígenes y `credentials`; sin `*` | `backend/src/app.js`, `backend/src/configuracion/entorno.js` (`origenesPermitidos`) |
| Validación *fail-closed* del entorno | `entorno.js`: puerto, hops de proxy, secreto JWT ≥ 32 en producción, orígenes URL, proveedor OCR, rangos numéricos; nunca imprime valores |
| Verificación JWT con algoritmo e issuer fijos | `backend/src/intermedios/sesion.js` (`algorithms: ['HS256']`) |
| Autorización por rol | `autorizar('amministratore')` en configuración, reportes, tareas y calendario |
| Alcance por técnico en listado, detalle, edición y borrado | `alcanceTecnico`, `puedeAccederIntervento`, `puedeAccederBoleta`, `puedeAccederScontrino`, `puedeAccederActividad` |
| Contraseñas con `bcryptjs` (12 rondas) | `backend/src/modulos/configuracion/servicio.js`, `autenticacion/servicio.js` |
| Comparación de contraseña en tiempo constante ante usuario inexistente | `HASH_FICTICIO` en `autenticacion/servicio.js` |
| Refresh token opaco (48 bytes), guardado solo como SHA-256, con rotación, caducidad y detección de reuso | `autenticacion/servicio.js`, `0008_sesiones_refresco.sql` |
| Validación de entrada con Zod en los cuerpos principales | `backend/src/modulos/*/esquemas.js` y servicios |
| SQL siempre parametrizado; identificadores dinámicos solo desde lista blanca | `base-datos/pool.js`, `configuracion/servicio.js` (`catalogoConfigurable`) |
| Límites de acceso, refresco, OCR y general | `backend/src/intermedios/limite.js` |
| Imagen de scontrino validada por MIME, base64 y tamaño (8 MB) | `backend/src/modulos/scontrini/servicio.js` (`analizarImagenEntrada`) |
| Errores uniformes; el manejador final no expone la traza | `backend/src/intermedios/errores.js` |
| CSV neutro frente a inyección de fórmulas | `backend/src/modulos/reportes/servicio.js` (`prefijoPeligroso`) |
| Cabeceras del SPA (CSP, HSTS, `X-Frame-Options: DENY`, Permissions-Policy) | `frontend/nginx.conf` |
| Acceso a la ficha y fotos de máquina solo para administrador o técnico autorizado | `backend/src/modulos/maquinas/rutas.js`, `puedeAccederMaquina` |
| Fotos de máquina validadas por MIME/base64/tamaño y servidas con sesión | `maquinas/servicio.js`, `utilidades/imagenes.js`, `macchine_foto` |
| Tema inicial sin script inline (CSP estricta de script) | `frontend/public/theme-init.js` |

### 2.2 Frontend

| Control | Evidencia |
| --- | --- |
| Sin HTML dinámico ni `dangerouslySetInnerHTML`/`eval` | `frontend/src` (sin coincidencias) |
| Datos de API renderizados como texto JSX | Todas las pantallas |
| Guardas de sesión: `401` → refresco único → salida al login | `frontend/src/compartido/api/cliente.js` |
| Solo preferencias en `localStorage` (tema e idioma) | `App.jsx`, `constantes.js` |
| Diálogos accesibles declarados (`role="dialog"`, `aria-modal`) y cierre con etiqueta | Hojas de trabajo, detalle, configuración, actividades y calendario |

## 3. Hallazgos

| ID | Severidad | Hallazgo | Evidencia | Estado |
| --- | --- | --- | --- | --- |
| S-01 | **Crítico** | El token de acceso y el de refresco vivían en `localStorage`; un XSS podía exfiltralos. | `frontend/src/compartido/api/cliente.js` (antes) | **Resuelto y verificado en producción** `[V]` (2026-10-19): cookies `HttpOnly` + CSRF en memoria; el cliente ya no persiste tokens ni existe cookie CSRF legible. En desarrollo/tests se conserva `Bearer` solo fuera de producción. |
| S-02 | Crítico | `proxy-addr` 2.0.7 permitía suplantación de IP en subred de confianza. | `npm audit` del 2026-10-19 | **Resuelto** `[V]` (`npm audit fix`) |
| S-03 | Alto | `trust proxy` fijo en `1`: detrás de dos Nginx todos los clientes compartían la cubeta de rate limiting. | `backend/src/app.js` (antes) | **Resuelto y verificado en producción** `[V]` con `TRUST_PROXY_HOPS=2`; login correcto y CSRF por cliente. |
| S-04 | Alto | El SPA no tenía CSP ni HSTS propios. | `frontend/nginx.conf` (antes) | **Resuelto y verificado en producción** `[V]`: CSP, HSTS, `X-Frame-Options: DENY`, `nosniff` y Permissions-Policy presentes en la respuesta HTTPS. |
| S-05 | Medio | La rotación del refresh token hace `SELECT` y luego `UPDATE` sin transacción: dos refrescos simultáneos pueden ambos pasar. | `autenticacion/servicio.js` (`renovarSesion`) | **Abierto** (prioridad 0.2 de `09`) |
| S-06 | Medio | El CSV no neutralizaba fórmulas (`=`, `+`, `-`, `@`). | `reportes/servicio.js` | **Resuelto** `[V]` |
| S-07 | Medio | El OCR local consume CPU; el límite general era demasiado alto para esa ruta. | `intermedios/limite.js` | **Mitigado** `[V]` (`limiteOcr` 30/15 min); sigue siendo costoso por petición |
| S-08 | Medio | Todo técnico autenticado lista todos los clientes y máquinas del negocio. | `catalogos/rutas.js` (`/clienti`, `/maquinas`) | **Decisión** `D-05`: el flujo de campo lo necesita; se evalúa minimizar campos |
| S-09 | Medio | No hay registro de auditoría de eventos de seguridad (acceso, refresco, denegaciones, cambios de usuario). | No existe tabla ni servicio | **Abierto** → `D-06` |
| S-10 | Medio | El límite de acceso es por IP; no hay bloqueo por cuenta ni retardo progresivo. | `intermedios/limite.js` | **Parcial** (IP corregida con S-03) |
| S-11 | Bajo | Los identificadores de ruta no se validan como enteros; MySQL los coerciona. | `interventos/rutas.js`, `boletas/rutas.js`, `scontrini/rutas.js` | **Abierto** |
| S-12 | Bajo | El token de acceso sigue válido hasta 10 minutos tras cerrar sesión (no hay lista de revocación). | `autenticacion/servicio.js`, `sesion.js` | Aceptado por diseño; documentar |
| S-13 | Bajo | En desarrollo, `JWT_SECRET` cae a `solo-sviluppo` si no se define. | `entorno.js` | **Mitigado**: en producción es obligatorio, ≥ 32 caracteres y sin plantilla |
| S-14 | Bajo | Varios `400` devuelven `error.message` interno. | `rutas.js` de varios módulos | Aceptado: son mensajes de negocio, sin traza ni SQL |
| S-15 | Bajo | `CORS_ORIGIN` con `credentials: true`; hoy no hay cookies. | `app.js`, `entorno.js` | Revisar al migrar a cookies (`D-01`) |
| S-16 | Bajo | El usuario de aplicación de MariaDB se crea para `'%'`. | `infraestructura/mariadb/inicializar-usuarios.sh` | Aceptado: la base solo publica en loopback |
| S-17 | Bajo | Sin cifrado en reposo del volumen MariaDB. | `docker-compose.yml` | **Decisión** `D-02` |
| S-18 | Bajo | Sin copia de seguridad automática ni restauración probada. | — | **Abierto** → `D-07` |
| S-19 | Bajo | Las tipografías se cargan desde Google Fonts (tercero). | `frontend/index.html` | **Propuesta** `[P]`: autoalojarlas |
| S-20 | Bajo | No había CI ni auditoría de dependencias continua. | `.github/workflows/verificacion.yml` (nuevo) | **Resuelto** `[V]` en repo; activo al publicar la rama |

## 4. Matriz amenaza → control → hueco

| Amenaza | Control existente | Hueco declarado |
| --- | --- | --- |
| Robo de sesión por XSS | Sin HTML dinámico; datos como texto | Tokens en `localStorage` sin `HttpOnly` (S-01) y sin CSP hasta ahora (S-04) |
| Fuerza bruta en acceso | Límite por IP corregido; comparación en tiempo constante | Sin bloqueo por cuenta (S-10) |
| Cruce entre técnicos | Alcance por propiedad en cada consulta y detalle; ficha de máquina restringida por `macchine_utenti` | El catálogo `GET /maquinas` sigue siendo global (S-08); la ficha y las fotos no |
| Acceso anónimo por NFC/URL | Redirección al login con `next` seguro; API 401 sin sesión y 403 sin autorización | La URL del SPA es pública como shell; los datos no se sirven sin sesión |
| Inyección SQL | Parámetros `?`; lista blanca de tablas | Ninguno declarado |
| Inyección en CSV | Neutralización de fórmulas | Ninguno declarado |
| Denegación por abuso de OCR | Límite específico + cola + tiempo límite | Consumo de CPU por petición (S-07) |
| Suplantación de IP en proxies | `trust proxy` configurable y dependencia corregida | Verificación en VPS `[NV]` |
| Fuga de secretos al repositorio | `.env` ignorado; plantillas sin valores reales; validación de plantillas en producción | Sin gestor de secretos ni rotación (`D-03`) |
| Interceptación en tránsito | TLS en el Nginx del host; HSTS añadido en el contenedor | Sin verificación de TLS en esta sesión `[NV]` |
| Fuga por copia de seguridad | Volumen local | Sin cifrado ni restauración probada (S-17/S-18) |

## 5. Plan de remediación

Orden acordado en `09-post-roadmap.md`:

1. **S-01 / `D-01` — hecho** `[V]`: cookies `HttpOnly` + `SameSite=Strict`, CSRF
   en cabecera para mutaciones y cliente sin `localStorage`. Queda la prueba de
   integración completa en el VPS/CI.
2. **S-05** — Rotación atómica del refresh token y ventana de gracia para la
   detección de reuso concurrente.
3. **S-09 / `D-06`** — Auditoría de eventos de seguridad y política de retención.
4. **S-08 / `D-05`** — Minimizar catálogo visible al técnico y/o justificar el
   acceso global por escrito.
5. **S-11** — Validar identificadores con Zod en todas las rutas.
6. **S-18 / `D-07`** — Copia de seguridad y restauración probadas.
7. **S-17 / `D-02`** — Cifrado en reposo y endurecimiento del borde.
8. **S-19** — Autoalojar tipografías.
9. **`D-03`** — Evaluar gestor de secretos y rotación.

## 6. Reglas de seguridad para el próximo cambio

1. La sesión va en cookies `HttpOnly`; el CSRF vive en memoria y se exige en toda
   mutación autenticada por cookie. Nada de tokens en `localStorage`,
   `sessionStorage`, IndexedDB o cookies legibles por JavaScript.
2. Todo endpoint valida el rol y la propiedad **en el servidor**; nada se deriva
   de un identificador enviado por el cliente. Los identificadores públicos son
   UUID, no números correlativos.
3. Ninguna consulta nueva interpola valores del usuario ni identificadores fuera
   de una lista blanca.
4. Toda dependencia nueva o actualización se verifica con `npm audit`.
5. Un cambio de seguridad relevante se acompaña de una prueba negativa.
