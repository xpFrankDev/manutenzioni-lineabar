# 03 — Modelo de datos

> **Estado: DISEÑO VERIFICADO (revisión 2026-10-19).** Fuente: migraciones
> versionadas en `backend/src/base-datos/migraciones/`. El contrato de datos está
> en italiano y no se renombra sin migración aprobada.

## 1. Reglas

- MariaDB 10.11; el esquema se aplica **solo** desde SQL versionado y numerado.
- Una migración aplicada no se modifica: se añade el archivo con el número
  siguiente (`AGENTS.md`).
- Todas las tablas operativas llevan auditoría: `creato_at`, `modificado_at`,
  `utente_crea`, `utente_modifica` y `stato`.
- **Todas las claves primarias y foráneas son UUID** (`CHAR(36)` ascii). No hay
  identificadores autoincrementales ni relaciones por número correlativo. La
  migración `0010_uuid_identificadores.js` convierte una base existente sin
  perder filas.
- Los códigos de negocio son únicos por índice; la concurrencia se resuelve en el
  servicio con reintento.
- Las consultas de la aplicación usan parámetros `?`; solo los nombres de tabla y
  columna de la configuración genérica proceden de una lista blanca en código.

## 2. Migraciones

| Archivo | Contenido |
| --- | --- |
| `0001_esquema_inicial.sql` | Roles, usuarios, proveedores, clientes, marcas, máquinas, manutenciones, piezas, características, boletas, calendario y tareas. |
| `0002_...utenti_codice_usuario_e_macchine_fornitore.sql` | Código de usuario, proveedor de la máquina y backfill de datos. |
| `0003_marca_linea_bar.sql` | Nombre del administrador inicial. |
| `0004_attivita_multi_tecnici.sql` | Observación, cierre y tabla `attivita_tecnici`. |
| `0005_manutenzioni_ore_persone.sql` | `ore` y `persone` en `manutenzioni`. |
| `0006_calendario_operativo.sql` | Único por máquina/ricambio, índices, `fk_attivita` y `note`. |
| `0007_scontrini.sql` | `scontrini` con imagen y `boletas.fk_scontrino`. |
| `0008_sesiones_refresco.sql` | Sesiones de refresco con hash, caducidad y revocación. |
| `0009_parametros_operativos.sql` | Tabla `parametros` y valores por defecto. |
| `0010_uuid_identificadores.js` | Convierte todas las claves primarias y foráneas a UUID conservando los datos. |

El runner (`migraciones/ejecutar.js`) crea `migraciones_aplicadas`, aplica en
orden, se detiene al primer error y registra cada archivo; es idempotente. Si
detecta una instalación anterior al control de versiones, registra lo ya aplicado.

## 3. Tablas principales

| Tabla | Función | Relaciones clave |
| --- | --- | --- |
| `ruoli` | Roles `amministratore`/`tecnico`. | — |
| `utenti` | Usuarios con `password_hash` bcrypt. | `fk_ruolo` |
| `fornitori`, `marche` | Maestros de proveedor y marca. | — |
| `clienti` | Clientes con código único `PRIV-NNNN` o `<PROVEEDOR>-NNNN`. | `fk_fornitore` |
| `macchine` | Máquinas con `codice_unico` y tipo. | `fk_cliente`, `fk_marca`, `fk_fornitore` |
| `manutenzioni` | Intervención con fecha, ubicación, esito, horas y personas. | `fk_cliente`, `fk_tecnico` |
| `macchine_manutenzioni` | Relación N:M intervención–máquina. | — |
| `pezzi`, `tipi_caratteristiche`, `pezzi_tipi_caratteristiche` | Catálogo de ricambi y sus características. | `fk_marca`, `fk_pezzo` |
| `pezzi_manutenzioni` | Ricambi usados con precio congelado. | `fk_manutenzione`, `fk_pezzo` |
| `boletas`, `boletas_manutenzioni`, `boletas_macchine`, `boletas_operatori` | Boleta y sus vínculos. | `fk_cliente`, `fk_tecnico`, `fk_scontrino` |
| `calendario_manutenzioni_macchine` | Próxima manutención por máquina y ricambio. | `fk_macchina`, `fk_pezzo`, `fk_attivita` |
| `attivita`, `attivita_tecnici` | Tareas programadas y asignación. | `fk_cliente`, `fk_macchina`, `fk_tecnico` |
| `scontrini` | Imagen, texto OCR y nombre detectado. | `fk_cliente`, `fk_tecnico` |
| `sesiones_refresco` | Refresh tokens (solo hash) con rotación. | `fk_utente` |
| `parametros` | Tarifa, avisos, horizontes. | — |

## 4. Semillas

- `semillas/datos-base.sql` `[V]`: roles, proveedores, marcas, características y
  ricambi reales; idempotente con `INSERT IGNORE`.
- `semillas/datos-demostracion.sql` `[V]`: clientes, máquinas y registros de
  septiembre de 2026; solo se carga con `LINEABAR_CARGAR_DEMO=1`.
- `semillas/sembrar.js` `[V]`: crea o sincroniza el administrador con
  `LINEABAR_ADMIN_PASSWORD` cifrada en tiempo de ejecución; nunca se versiona un hash.

## 5. Códigos de negocio

| Entidad | Formato | Generación |
| --- | --- | --- |
| Identificador interno | UUID v4 (`CHAR(36)`) | `crypto.randomUUID()` en el servicio; el UUID no se deriva del código de negocio. |
| Cliente privado | `PRIV-0001` | Transacción + `MAX` + reintento ante duplicado. |
| Cliente de proveedor | `<CODICE_PROVEEDOR>-0001` | Igual, con prefijo del proveedor. |
| Boleta | `BL-AAAA-MM-NNNN` | `proximoCodigoBoleta` dentro de la transacción de emisión. |
| Máquina | `codice_unico` libre, único | Validación Zod + índice único. |

## 6. Persistencia de imágenes

Las fotos de scontrini se guardan como `LONGBLOB` en `scontrini.immagine` `[V]`.
Ventaja: una sola copia de seguridad. Límite `[D]`: no hay política de retención
ni almacenamiento externo firmado (`D-08` en `07`).

## 7. Desviaciones declaradas

- Los campos de actor se llaman `utente_crea`/`utente_modifica`, no
  `fk_usuario_modificado` como sugiere la preferencia compartida. Cambiarlos exige
  una migración y no aporta hoy; se conserva el contrato desplegado.
- `macchine.fk_marca` es `NOT NULL`; el servicio resuelve marca explícita, la del
  proveedor o la primera activa.
