# 02 — Estado funcional y cumplimiento del roadmap

> **Estado: AUDITORÍA `[V]` (revisión 2026-10-19).** Contrasta cada objetivo de
> `ROADMAP.md` y `PRODUCT.md` con el código real y con `05-verificacion.md`.
> No sustituye al roadmap: lo audita.

## 1. Conclusión

La funcionalidad comprometida en `ROADMAP.md` (secciones 1 a 6) está
**implementada y probada** `[V]`. Las carencias reales no son funcionales sino de
**documentación, gobernanza y endurecimiento**:

- No existía documentación post-roadmap: solo `ROADMAP.md` y `README.md`.
- El roadmap declaraba «terminado» el bloque de seguridad sin registrar sus
  límites (tokens en `localStorage`, `trust proxy`, CSP del SPA).
- No había registro de decisiones abiertas ni protocolo de continuidad.

Esto último se corrige con `docs/00`–`09`; lo no resuelto queda en `07`.

## 2. Cumplimiento del roadmap

| Roadmap | Objetivo | Estado | Evidencia |
| --- | --- | --- | --- |
| §1 | Calendario de manutenciones operativo con filtros y avisos | **Terminado** `[V]` | `backend/src/modulos/calendario/servicio.js`, `frontend/src/funcionalidades/calendario/Calendario.jsx`, prueba de integración «calendario». |
| §2 | Flujo de campo cliente → máquina → ricambi/mano de obra → resumen | **Terminado** `[V]` | `frontend/src/funcionalidades/interventos/HojaTrabajo.jsx`, `backend/src/modulos/interventos/servicio.js`. |
| §3 | Scontrino con OCR local y alta de cliente desde la foto | **Terminado (MVP)** `[V]` | `backend/src/modulos/scontrini/`, `ocr.js` con Tesseract local. Precisión con fotos reales sin medir `[NV]`. |
| §4 | Reportes mensuales y exportación CSV | **Terminado** `[V]` | `backend/src/modulos/reportes/`, `frontend/src/funcionalidades/reportes/Reportes.jsx`. |
| §5 | Maestros completos y cierre de huecos | **Terminado** `[V]` | `backend/src/modulos/configuracion/servicio.js`, `clientes/`, `maquinas/`. |
| §6 | Sesión y seguridad de la iteración | **Terminado con reservas** `[V]` | Ver `04-seguridad.md`: rotación, alcance por técnico, Zod y límites existen; tokens en `localStorage` y `trust proxy` requieren decisión. |
| §7.1–7.9 | Próximas iteraciones | **Pendientes** `[V]` | Sin cambios; priorizadas en `09-post-roadmap.md`. |

## 3. Funcionalidad entregada, por capacidad

- **Autenticación** `[V]`: login con `bcryptjs`, JWT de 10 minutos, refresco opaco
  rotativo con detección de reuso, cierre de sesión y sesión actual.
- **Roles** `[V]`: `amministratore` y `tecnico`; el técnico solo ve y modifica sus
  interventos, boletas y scontrini, y las tareas que tiene asignadas.
- **Flujo de campo** `[V]`: alta de cliente y máquina sin salir del formulario,
  búsqueda, compresión de foto, OCR, resumen con próxima manutención.
- **Mantenimientos** `[V]`: horas, personas, ricambios y esito persistidos.
- **Boletas** `[V]`: numeración `BL-AAAA-MM-NNNN`, totales con tarifa configurable,
  estados `bozza`/`emessa`/`annullata`, vínculo a scontrino.
- **Calendario** `[V]`: programación automática por intervalo del ricambio,
  avisos, filtros, programación de tarea y suspensión.
- **Tareas** `[V]`: asignación multi-técnico, estados y cierre que genera la
  manutención.
- **Maestros** `[V]`: proveedores, clientes, máquinas, marcas, piezas,
  características, usuarios y parámetros.
- **Ficha de máquina** `[V]`: detalle con carrusel de fotos (guardadas en MariaDB),
  cliente y proveedor identificados, datos de la máquina, historial de
  manutenciones con o sin boleta y su fecha, próxima manutención, enlace NFC
  copiable y gestión de accesos por técnico.
- **Reportes** `[V]`: cierre mensual, ranking de clientes/piezas/tipos, previsión y CSV.
- **Configuración** `[V]`: tarifa horaria, días de aviso, horizonte y previsión.
- **Control de acceso a fichas** `[V]`: tabla `macchine_utenti`, altas automáticas
  al crear máquina, manutención, boleta o tarea, backfill histórico y gestión
  explícita por el administrador. Las rutas sin sesión redirigen al login; sin
  autorización muestran una pantalla 403 de marca; una ruta inexistente muestra 404.
- **Permisos modulares** `[V]`: tablas `menu` y `ruoli_menu`; el administrador
  decide por rol qué secciones se ven y cuáles se pueden modificar. La navegación
  y las rutas del backend respetan la matriz; el rol técnico parte con campo y
  sin configuración ni reportes.
- **Avisos de interfaz** `[V]`: confirmaciones y notificaciones de marca propias,
  sin `confirm()`/`alert()` nativos, con bloqueo de scroll del fondo en modales.
- **Actividades** `[V]`: pulsar una tarea abre su ficha completa con acciones de
  tomar o cerrar.

## 4. Huecos funcionales declarados

1. **Boleta con varias máquinas en una emisión** `[NV]`: el esquema
   (`boletas_macchine`) lo permite; el formulario y el servicio crean una sola.
2. **Precisión real del OCR** `[NV]`: no hay medición con scontrinos de campo.
3. **Notificaciones fuera de la aplicación** `[NV]`: solo insignia y panel.
4. **PDF de boleta y firma del cliente** `[NV]`.
5. **Inventario/stock de ricambi** `[NV]`: `pezzi` es catálogo, no existencias.
6. **Roles de oficina** `[NV]`: solo administrador y técnico.
7. **Modo sin conexión** `[NV]`.
8. **Retención de imágenes de scontrini** `[NV]`.
9. **Copia de seguridad y restauración probadas** `[NV]`.

## 5. Documentación post-roadmap

Antes de esta migración no existía. Ahora:

| Necesidad | Documento |
| --- | --- |
| Estado y cumplimiento de metas | Este documento (`02`) |
| Arquitectura real | `01-arquitectura.md` |
| Modelo de datos | `03-modelo-datos.md` |
| Seguridad y hallazgos | `04-seguridad.md` |
| Evidencia de verificación | `05-verificacion.md` |
| Operación y despliegue | `06-operaciones.md` |
| Decisiones abiertas | `07-decisiones-abiertas.md` |
| Continuidad de agentes | `08-continuidad-agentes.md` |
| Plan posterior | `09-post-roadmap.md` |

## 6. Cumplimiento de `PRODUCT.md`

Verificado `[V]`: plataforma web, stack declarado, interfaz móvil primero, rutas
bajo `/lineabar/`, campos de auditoría, datos de demostración separados y
despliegue tras Nginx compartido. No verificado `[NV]`: accesibilidad con lector
de pantalla y fidelidad visual sobre dispositivo real tras los últimos cambios.
