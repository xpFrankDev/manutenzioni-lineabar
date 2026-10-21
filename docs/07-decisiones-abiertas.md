# 07 — Decisiones abiertas

> **Estado: REGISTRO `[D]` (revisión 2026-10-21).** Ninguna decisión se cierra por
> silencio. Cada fila indica el motivo por el que no se ejecuta y el criterio para
> cerrarla. El agente **no** las toma por el propietario.

## Seguridad y operación

| ID | Decisión | Motivo / bloqueo | Criterio de cierre |
| --- | --- | --- | --- |
| **D-01** | Migrar la sesión a cookie `HttpOnly` + `SameSite=Strict` y CSRF en memoria; retirar tokens de `localStorage`. | **Resuelta (aprobada por el propietario, 2026-10-19).** Implementada en backend y frontend; en desarrollo/tests se conserva `Bearer` solo fuera de producción. | Cumplida en código: cookie emitida, CSRF exigido, `localStorage` sin tokens. La suite de integración completa se valida en CI/VPS. |
| **D-02** | Cifrado en reposo y endurecimiento del borde (WAF/CDN, TLS verificado, política de cabeceras definitiva). | Depende del VPS y de una decisión de infraestructura; no se ejecuta en local. | Entorno desplegado con TLS y copia cifrada verificados. |
| **D-03** | Gestor de secretos y rotación (Vault/Secrets Manager/Doppler). | Dependencia externa de pago; hoy la inyección por `.env` es suficiente para uso interno. | Plan de migración de `.env` con rotación verificada y sin secretos en disco del repositorio. |
| **D-04** | Entorno de staging separado de producción. | Un solo VPS y un solo host compartido; conviene decidir antes de crecer. | Staging desplegado con base y secretos propios. |
| **D-05** | Alcance del catálogo visible al técnico (clientes y máquinas globales). | El flujo de campo necesita buscar cualquier cliente/máquina; hay que ponderar privacidad. | Decisión escrita y, si aplica, minimización de campos o filtro por zona/asignación. |
| **D-06** | Auditoría de eventos de seguridad y retención de logs. | No existe tabla ni servicio; hay que definir qué se registra y cuánto se conserva. | Tabla de auditoría, eventos mínimos y política de retención aplicada. |
| **D-07** | Copia de seguridad automática y restauración probada. | No hay automatización ni prueba de restauración. | Copia programada, restauración verificada y documentada en `06`. |
| **D-08** | Retención y almacenamiento de imágenes de scontrini. | Hoy van a `LONGBLOB` sin política; crecerá con el uso. | Política de retención y, si procede, almacenamiento externo firmado. |

## Producto

| ID | Decisión | Motivo / bloqueo | Criterio de cierre |
| --- | --- | --- | --- |
| **D-09** | Boleta con varias máquinas en una sola emisión. | Falta decidir el reparto de horas y mano de obra por máquina. | Regla de reparto aprobada, formulario y servicio actualizados, pruebas. |
| **D-10** | Roles de oficina (más allá de administrador/técnico). | No hay requisito cerrado de qué puede ver y hacer oficina. | Matriz de permisos aprobada y aplicada en servidor. |
| **D-11** | Modo sin conexión y cola de envíos. | Cambio grande de arquitectura de cliente y conflicto de datos. | Diseño aprobado y prototipo con resolución de conflictos. |
| **D-12** | Notificaciones fuera de la aplicación (correo/WhatsApp/push). | Falta elegir canal, proveedor y coste. | Canal y proveedor decididos; envío con consentimiento y pruebas. |
| **D-13** | PDF de boleta y firma del cliente. | No hay requisito legal cerrado ni plantilla. | Formato y valor legal aprobados; generación y almacenamiento definidos. |
| **D-14** | Inventario/stock de ricambi. | `pezzi` es catálogo, no existencias; falta el modelo de movimientos. | Modelo de stock aprobado, migración y pantalla de existencias. |
| **D-15** | Adopción de TypeScript y/o NestJS en el backend. | El backend actual funciona, está probado y desplegado; migrar añade riesgo. | Decisión explícita; si se aprueba, plan incremental con pruebas por módulo. |
| **D-16** | Identificadores UUID en todas las tablas. | **Resuelta (instrucción del propietario, 2026-10-19).** Migración `0010_uuid_identificadores.js`; claves primarias y foráneas UUID. | Cumplida en esquema y código; validar la migración sobre una copia de la base real antes del despliegue. |
| **D-17** | Proveedor de IA para la programación y tratamiento de datos de clientes. | La integración acepta un endpoint compatible con Chat Completions y mantiene la clave en `.env`; falta decidir proveedor, coste y garantías de tratamiento. | Proveedor aprobado, clave en el servidor, aviso de privacidad y prueba con datos reales minimizados. |
| **D-18** | App compañera iOS para escribir NFC desde Linea Bar. | Safari/WebKit no expone Web NFC; hoy iOS copia el enlace para NFC Tools. | Decisión entre depender de NFC Tools o publicar una app con Core NFC y Universal Link. |

## Cómo se cierra una decisión

1. El propietario indica la resolución en el encargo o en una sesión.
2. Se actualiza esta tabla (estado y fecha) y el documento afectado.
3. Se registra la evidencia en `05-verificacion.md`.
