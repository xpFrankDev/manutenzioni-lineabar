# 01 — Arquitectura

> **Estado: DISEÑO VERIFICADO (revisión 2026-10-19).** Describe la arquitectura
> **real** del repositorio, no una arquitectura objetivo. Toda desviación frente
> al proyecto de referencia se registra aquí y su decisión en `07`.

## 1. Resumen

Linea Bar es una aplicación web **móvil primero** para registrar manutenciones de
máquinas de bar: clientes, máquinas, ricambi, horas, boletas y calendario de
próximas manutenciones. Es un monolito de dos piezas desplegables más una base de
datos:

| Pieza | Tecnología `[V]` | Ruta |
| --- | --- | --- |
| API | Node.js 22 + Express 5 (JavaScript, ESM) | `backend/` |
| Cliente | React 19 + Vite 8 (JavaScript/JSX) | `frontend/` |
| Datos | MariaDB 10.11 con SQL versionado | `backend/src/base-datos/migraciones/` |
| Borde | Nginx compartido del VPS + Nginx del contenedor | `infraestructura/nginx/` |

No hay TypeScript, NestJS, ORM ni SSR: la persistencia es SQL explícito
parametrizado sobre `mysql2/promise` (`backend/src/base-datos/pool.js`).

## 2. Backend

Organización por dominio en `backend/src/modulos/`; cada módulo agrupa rutas,
esquemas Zod y servicios:

- `autenticacion`: acceso, refresco rotativo, cierre y sesión actual.
- `tablero`: métricas y últimos registros del panel, con alcance por técnico.
- `catalogos`: listas de apoyo para el flujo de campo (máquinas, piezas, clientes,
  marcas, proveedores, técnicos) y alta rápida de cliente/máquina.
- `interventos`: alta, edición, borrado lógico y detalle de manutenciones.
- `boletas`: emisión de boleta con totales, vínculo a scontrino y cambio de estado.
- `calendario`: consulta, resumen, programación y reprogramación de manutenciones.
- `scontrini`: análisis OCR, imagen guardada y alta de cliente desde la foto.
- `reportes`: cierre mensual y exportación CSV (solo administrador).
- `parametros`: tarifa, días de aviso y horizontes configurables.
- `actividades`: tareas programadas, asignación multi-técnico y cierre.
- `configuracion`: CRUD genérico de maestros con lista blanca de tablas/columnas.

Infraestructura transversal:

- `backend/src/intermedios/sesion.js`: verificación JWT y autorización por rol.
- `backend/src/intermedios/limite.js`: límites de acceso, refresco, OCR y generales.
- `backend/src/intermedios/errores.js`: respuesta uniforme de errores.
- `backend/src/configuracion/entorno.js`: lectura y validación *fail-closed* del entorno.

Flujo de una petición: Nginx → Express → `exigirSesion`/`autorizar` → esquema Zod
→ servicio del módulo → `pool` MariaDB (siempre con parámetros `?`). El error se
normaliza en el manejador final.

## 3. Frontend

Estructura de carpetas por responsabilidad:

- `src/app/`: composición de la aplicación, preferencias e i18n.
- `src/compartido/`: cliente HTTP, componentes, dominio puro, i18n y utilidades.
- `src/funcionalidades/<dominio>/`: pantallas por dominio (autenticación, tablero,
  interventos, calendario, reportes, configuración y actividades).
- `src/estilos/`: tokens, base, componentes y reglas específicas de iOS.

No hay router externo: `src/compartido/constantes.js` define rutas y `App.jsx`
sincroniza `pushState`/`popstate`. La navegación principal es un rail lateral en
escritorio y barra inferior en móvil (`funcionalidades/navegacion/Navegacion.jsx`).

El estado remoto se gestiona con `useState`/`useEffect` y el cliente único
`src/compartido/api/cliente.js`, que adjunta el token y renueva la sesión ante `401`.

## 4. Datos y contrato

El contrato de datos está en italiano y **no se renombra** sin migración aprobada
(`AGENTS.md`). Los identificadores de código, comentarios y documentación técnica
van en español. El esquema detallado está en `03-modelo-datos.md`.

Puntos de integridad relevantes `[V]`:

- Índices únicos para códigos de cliente, boleta y máquina; el servicio reintenta
  ante concurrencia (`backend/src/modulos/clientes/servicio.js`).
- FK compuestas y `ON DUPLICATE KEY UPDATE` para el calendario por máquina y pieza.
- Campos de auditoría (`creato_at`, `modificado_at`, `utente_crea`, `utente_modifica`,
  `stato`) en todas las tablas operativas.

## 5. Despliegue

- El contenedor `frontend` publica en `127.0.0.1:8091` y sirve el SPA bajo
  `/lineabar/`; Nginx del host termina TLS y enruta por prefijo (`docker-compose.yml`,
  `infraestructura/nginx/ag-lineabar.conf`).
- El contenedor `backend` escucha en `3001` dentro de la red Docker, sin publicar.
- MariaDB publica solo en loopback (`127.0.0.1:3308`).
- Migraciones y semilla se ejecutan una vez en el servicio `inicializacion` con el
  usuario de migraciones (DDL limitado a la base); la API usa un usuario CRUD.

## 6. Fronteras y decisiones de arquitectura

| Decisión | Estado | Motivo |
| --- | --- | --- |
| Express + JavaScript en vez de NestJS + TypeScript | `[V]` vigente | El backend ya está implementado, probado y desplegado; migrarlo no aporta valor al cliente y añade riesgo. Se reevalúa en `09-post-roadmap.md`. |
| SQL explícito en vez de ORM | `[V]` vigente | Consultas cortas, control total de parámetros y migraciones legibles. |
| MariaDB en vez de PostgreSQL | `[V]` vigente | Base ya desplegada y preferencia compartida del usuario. |
| Router manual en vez de React Router | `[V]` vigente | Siete rutas y dos hojas; el coste de una dependencia no está justificado hoy. |
| Sesión con cookie `HttpOnly` + CSRF | `[V]` vigente (2026-10-19) | El JWT y el refresh viajan en cookies `HttpOnly`; el CSRF se exige en mutaciones. En desarrollo/tests se conserva `Bearer` fuera de producción (`D-01`). |
| Identificadores UUID en todas las tablas | `[V]` vigente (2026-10-19) | Evita enumeración y relaciones por número correlativo; migración `0010` conserva datos (`D-16`). |

## 7. Desviaciones conocidas respecto al proyecto de referencia

El repositorio `/home/dev/Documentos/proyecto-trading-saas` se usa como referencia
de **forma de trabajo, gobernanza y seguridad**, no como plantilla de producto:

- Referencia: NestJS + TypeScript + PostgreSQL + TypeORM. Linea Bar: Express +
  JavaScript + MariaDB + SQL (decisión vigente, sección 6).
- Referencia: sesión en cookie `HttpOnly` y CSRF en memoria. Linea Bar: JWT en
  `localStorage` (`[NV]` aceptable solo como deuda declarada, ver `D-01`).
- Referencia: documentación numerada, decisiones `[D]` y protocolo de continuidad.
  Linea Bar los adopta en `docs/` (este índice y `08`).

Ninguna pieza de la referencia se copia de forma literal; se adapta al stack real.
