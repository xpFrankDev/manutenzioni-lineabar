# Instrucciones de Linea Bar

## Idioma y convenciones

- La interfaz de usuario y la documentación de producto (README, DESIGN, PRODUCT) están en italiano: es el idioma del cliente y del contexto operativo.
- El código de aplicación, los nombres de carpetas, los comentarios y las herramientas usan español, siguiendo la convención compartida de `/home/dev/Documentos/Codex/AGENTS.md`.
- El contrato de datos (tablas, columnas y campos de la API como `ubicazione`, `esito` o `codice_unico`) se mantiene en italiano: ya está desplegado y no se renombra sin una migración aprobada.
- La documentación técnica interna vive en `docs/` en español, numerada y plana, con índice en `docs/00-indice.md`.

## Documentación y evidencia

- `docs/00-indice.md` es la entrada: mapa documental, etiquetas de evidencia y orden de lectura.
- Toda afirmación sobre el estado del proyecto lleva etiqueta `[V]` verificado, `[P]` propuesta, `[NV]` no verificado o `[D]` decisión pendiente, con referencia a ruta o comando.
- Todo cambio de arquitectura, datos, seguridad o contrato actualiza el documento afectado **en el mismo cambio**.
- Las decisiones humanas se registran en `docs/07-decisiones-abiertas.md`; no se cierran por silencio.
- El estado funcional se audita en `docs/02-estado-funcional.md` y la evidencia real en `docs/05-verificacion.md`.

## Criterios visuales

- Interfaz operativa móvil primero: jerarquía clara, espaciado deliberado, objetivos táctiles de al menos 44 px y contraste accesible en tema claro y oscuro.
- Azul para navegación, acciones principales y contexto de máquina; los colores de estado se reservan para estados reales del trabajo.
- Todo control nuevo necesita estados de foco, error, carga, vacío y confirmación visibles.
- Cualquier cambio visual relevante se verifica sobre la aplicación renderizada antes de darlo por terminado.

## Persistencia y datos

- MariaDB con SQL versionado en `backend/src/base-datos/migraciones/`. No modificar una migración ya aplicada: añadir el archivo con el número siguiente.
- Los datos maestros van en `datos-base.sql` y los registros ficticios en `datos-demostracion.sql`, que solo se carga con `LINEABAR_CARGAR_DEMO=1`.
- Las contraseñas se cifran en tiempo de ejecución con `bcryptjs`. Nunca versionar hashes ni credenciales.
- Cada consulta usa parámetros (`?`); no interpolar valores del usuario en SQL. Los nombres de tabla y columna solo proceden de una lista blanca en código.
- Todas las tablas usan UUID como clave primaria y foránea (`CHAR(36)`); no introducir identificadores autoincrementales ni relaciones por número correlativo.

## Seguridad de aplicación

- La sesión viaja en cookies `HttpOnly` (`lineabar_sesion` y `lineabar_refresco`) y el token CSRF vive en memoria; las mutaciones por cookie exigen `X-CSRF-Token`. Prohibido persistir tokens, credenciales, sesiones o secretos en `localStorage`, `sessionStorage`, IndexedDB o cookies legibles por JavaScript.
- Todo endpoint valida el rol y la propiedad del registro **en el servidor**; ningún permiso se deriva de un identificador enviado por el cliente.
- Toda entrada se valida con Zod en el servidor; no confiar en la validación del cliente.
- Los errores no exponen trazas, SQL ni secretos.
- Un cambio de seguridad relevante se acompaña de una prueba negativa.
- No adoptar dependencias ni infraestructura externas nuevas (gestor de secretos, WAF, CDN, proveedor de notificaciones) sin decisión registrada en `docs/07`.

## Entorno y configuración

- El entorno se valida al arrancar (`backend/src/configuracion/entorno.js`): si falta una variable crítica o su valor es inválido, el proceso falla cerrado nombrando la variable y **sin** imprimir su valor.
- Prohibido fijar puertos, hosts o rutas en código nuevo: se toman del entorno validado. Nunca escuchar en `0.0.0.0`.
- `TRUST_PROXY_HOPS` debe reflejar la topología real de proxies; si no, el límite de peticiones deja de ser por cliente.
- No ejecutar `docker compose up` sin un `.env` válido; no usar `docker compose down -v`.

## Flujo de trabajo y despliegue

- Desarrollar y verificar todo en local. Cualquier cambio en el VPS requiere aprobación explícita del usuario.
- Acumular los cambios confirmados y desplegar una sola vez, al final, con `infraestructura/despliegue/actualizar.sh`.
- Antes del despliegue revisar migraciones pendientes, secretos propios de producción y el plan de reversión.
- No sobrescribir `.env` en el VPS, no eliminar volúmenes y no ejecutar `docker compose down -v`.
- Nginx es compartido: cada proyecto se aísla por prefijo de ruta y nunca se duplica un `server_name`.
- Trabajar en rama de funcionalidad; no hacer commit, push, PR, merge ni despliegue sin aprobación explícita para esa acción.

## Verificación mínima

| Cambio | Comprobación |
| --- | --- |
| Backend | `npm run verificar` y `npm run test:unidad`; integración si toca API, roles o SQL. |
| Frontend | `npm test` y `npm run build`. |
| Dependencias | `npm audit --omit=dev`. |
| Datos | Migración versionada nueva y probada contra MariaDB. |
| Visual | Revisión en móvil emulado, tema claro y oscuro, sin desbordes ni errores de consola. |

El protocolo de continuidad autónoma está en `docs/08-continuidad-agentes.md`.
