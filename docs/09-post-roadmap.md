# 09 — Plan posterior al roadmap

> **Estado: PLAN (revisión 2026-10-19).** Ordena el trabajo que sigue al roadmap de
> septiembre de 2026. Un elemento de este plan **no** es autorización automática:
> las decisiones reservadas se cierran antes en `07-decisiones-abiertas.md`.

## 1. Prioridad 0 — Seguridad y fiabilidad

| # | Trabajo | Relación | Criterio de aceptación |
| --- | --- | --- | --- |
| 1 | Sesión en cookie `HttpOnly` + CSRF en memoria; retirar tokens de `localStorage`. | S-01, `D-01` | **Hecho en código** `[V]`: login/refresco emiten cookie `HttpOnly; SameSite=Strict`; mutaciones exigen `X-CSRF-Token`; `localStorage` sin tokens. Pendiente: suite completa en CI/VPS. |
| 2 | Rotación atómica del refresh token y ventana de gracia ante reuso concurrente. | S-05 | Dos refrescos simultáneos no invalidan la sesión legítima; el reuso malicioso sigue revocando la cadena; prueba con concurrencia. |
| 3 | Auditoría de eventos de seguridad y retención. | S-09, `D-06` | Tabla de auditoría; se registran acceso, refresco, cierre, denegación y cambios de usuario; retención definida. |
| 4 | Validación de identificadores de ruta y de cuerpos pendientes. | S-11 | Todas las rutas con `:id` validan UUID y devuelven 400/404 coherentes. |
| 5 | Copia de seguridad y restauración probadas. | S-18, `D-07` | Copia programada, restauración verificada y procedimiento en `06-operaciones.md`. |
| 6 | Verificación de `trust proxy` y cabeceras en el VPS. | S-03, S-04 | Con tráfico real, el límite es por cliente, no global; CSP y HSTS presentes; `200` final con TLS. |

## 2. Prioridad 1 — Producto

| # | Trabajo | Relación | Criterio de aceptación |
| --- | --- | --- | --- |
| 7 | Boleta con varias máquinas y reparto de horas. | `D-09` | Regla de reparto aprobada; emisión con N máquinas; totales y reportes correctos. |
| 8 | PDF de boleta y firma del cliente. | `D-13` | Documento generado y almacenado; pruebas de totales y formato. |
| 9 | Notificaciones de vencimiento. | `D-12` | Canal decidido; aviso el día de vencimiento con consentimiento y registro de envíos. |
| 10 | Inventario/stock de ricambi. | `D-14` | Movimientos de entrada/salida y existencia por almacén; migración y pantalla. |
| 11 | Roles de oficina. | `D-10` | Matriz de permisos aprobada y aplicada en servidor con pruebas negativas. |
| 12 | Precisión del OCR con fotos reales. | Roadmap §7.2 | Conjunto de fotos de campo medido; acierto registrado y mejoras aplicadas. |

## 3. Prioridad 2 — Plataforma y calidad

| # | Trabajo | Relación | Criterio de aceptación |
| --- | --- | --- | --- |
| 13 | CI en verde en cada PR (calidad + integración + auditoría). | S-20 | Los tres jobs de `.github/workflows/verificacion.yml` pasan en `main`. |
| 14 | Endurecimiento del borde y cifrado en reposo. | S-17, `D-02` | TLS validado, WAF/borde decidido, volumen cifrado. |
| 15 | Gestor de secretos y rotación. | `D-03` | `.env` migrado, rotación verificada. |
| 16 | Staging separado. | `D-04` | Entorno con base y secretos propios. |
| 17 | Autoalojar tipografías. | S-19 | Sin dependencia de Google Fonts; CSP sin terceros. |
| 18 | Tipo/estructura del backend (evaluación). | `D-15` | Decisión explícita; si se aprueba, plan incremental por módulo. |

## 4. Deuda técnica aceptada con vencimiento

| Deuda | Motivo | Revisar en |
| --- | --- | --- |
| Token de acceso válido hasta 10 minutos tras cerrar sesión. | Ventana corta y sin lista de revocación. | Cuando se implante `D-01`. |
| Mensajes internos en algunos `400`. | Son mensajes de negocio, sin traza ni SQL. | Si aparece un mensaje que revele estructura. |
| Usuario de base de datos para `'%'`. | La base solo publica en loopback. | Al cambiar la topología de red. |
| Router manual en el frontend. | Siete rutas y dos hojas. | Si crecen las rutas anidadas. |

## 5. Qué **no** entra

1. Reescribir el producto en otro stack sin decisión (`D-15`).
2. Ejecutar cambios en el VPS sin aprobación explícita.
3. Adoptar dependencias o servicios externos de pago sin decisión (`D-02`, `D-03`).
4. Exponer datos de clientes o secretos en logs, informes o repositorio.
