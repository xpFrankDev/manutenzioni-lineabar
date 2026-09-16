# Instrucciones de Linea Bar

## Idioma y convenciones

- La interfaz de usuario y la documentación de producto (README, DESIGN, PRODUCT) están en italiano: es el idioma del cliente y del contexto operativo.
- El código de aplicación, los nombres de carpetas, los comentarios y las herramientas usan español, siguiendo la convención compartida de `/home/dev/Documentos/Codex/AGENTS.md`.
- El contrato de datos (tablas, columnas y campos de la API como `ubicazione`, `esito` o `codice_unico`) se mantiene en italiano: ya está desplegado y no se renombra sin una migración aprobada.

## Criterios visuales

- Interfaz operativa móvil primero: jerarquía clara, espaciado deliberado, objetivos táctiles de al menos 44 px y contraste accesible en tema claro y oscuro.
- Azul para navegación, acciones principales y contexto de máquina; los colores de estado se reservan para estados reales del trabajo.
- Todo control nuevo necesita estados de foco, error, carga, vacío y confirmación visibles.
- Cualquier cambio visual relevante se verifica sobre la aplicación renderizada antes de darlo por terminado.

## Persistencia y datos

- MariaDB con SQL versionado en `backend/src/base-datos/migraciones/`. No modificar una migración ya aplicada: añadir el archivo con el número siguiente.
- Los datos maestros van en `datos-base.sql` y los registros ficticios en `datos-demostracion.sql`, que solo se carga con `LINEABAR_CARGAR_DEMO=1`.
- Las contraseñas se cifran en tiempo de ejecución con `bcryptjs`. Nunca versionar hashes ni credenciales.
- Cada consulta usa parámetros (`?`); no interpolar valores del usuario en SQL.

## Flujo de trabajo y despliegue

- Desarrollar y verificar todo en local. Cualquier cambio en el VPS requiere aprobación explícita del usuario.
- Acumular los cambios confirmados y desplegar una sola vez, al final, con `infraestructura/despliegue/actualizar.sh`.
- Antes del despliegue revisar migraciones pendientes, secretos propios de producción y el plan de reversión.
- No sobrescribir `.env` en el VPS, no eliminar volúmenes y no ejecutar `docker compose down -v`.
- Nginx es compartido: cada proyecto se aísla por prefijo de ruta y nunca se duplica un `server_name`.
