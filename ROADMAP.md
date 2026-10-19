# Roadmap · Linea Bar

> **Documento histórico (revisión 2026-10-19).** Registra el estado de septiembre
> de 2026 y se conserva como evidencia. El estado vigente, la seguridad, las
> decisiones abiertas y el plan posterior están en `docs/00-indice.md`. Si hay
> contradicción, mandan `docs/` y el código.

Estado de referencia: septiembre de 2026. Este documento registra qué está
terminado, qué quedó a medias y qué sigue después de la revisión funcional del
flujo de boletas, del calendario y de los maestros.

## 1. Calendario de manutenciones (terminado)

- Al registrar un intervento o una boleta, cada ricambio con `intervallo_mesi`
  programa automáticamente la próxima manutención de esa máquina
  (`calendario_manutenzioni_macchine`), renovando la fecha anterior.
- El calendario se consulta en `/lineabar/calendario` con filtros de vencidas,
  próximas, programadas y suspendidas, y con contadores por estado.
- El panel y la navegación muestran avisos (vencidas + próximas según
  `aviso_manutencion_dias`) y el panel lista las cinco más urgentes.
- Desde el calendario un administrador puede programar la actividad para un
  técnico, reprogramar fecha/frecuencia o suspender la programación.
- Los umbrales (días de aviso, horizonte del calendario, meses de previsión)
  viven en la tabla `parametros` y se editan desde Configuración.

## 2. Flujo de boleta e intervento (terminado)

Orden nuevo, de campo y móvil primero: **cliente → máquina del cliente →
ricambi y mano de obra → resumen**.

- El cliente se elige por búsqueda o se crea en el momento; desde una boleta
  también puede crearse a partir de la foto del scontrino.
- La máquina se filtra por cliente y se puede dar de alta sin salir del flujo.
- Horas y personas se persisten en `manutenzioni` (antes se perdían), por lo
  que la boleta, el reporte y el histórico son reconstruibles.
- El resumen anticipa la próxima manutención antes de guardar y el backend la
  confirma al persistir.

## 3. Scontrino y detección del nombre del cliente (MVP terminado)

- El botón «Scansiona lo scontrino» guarda la imagen en `scontrini` y devuelve
  el nombre detectado, vinculado al cliente existente si coincide.
- Si el cliente no existe, se crea desde la foto con los datos confirmados por
  el técnico.
- La detección es **local y gratuita**: Tesseract.js en el propio servidor con
  los datos de italiano incluidos como dependencia, más una heurística que
  elige la razón social del encabezado y descarta totales y datos fiscales.
  No depende de ninguna API de pago. Opcionalmente se puede activar un
  proveedor multimodal (`LINEABAR_OCR_PROVEEDOR=openai`) o desactivar el
  análisis (`ninguno`); en ambos casos la foto queda guardada y el técnico
  confirma el nombre.

## 4. Reportes (terminado)

`/lineabar/reportes` ofrece cierre mensual: boletas emitidas, ingresos, boleta
media, interventos, horas hombre, mano de obra valorizada, ricambi usados,
clientes atendidos, ingresos por cliente, piezas por consumo, interventos por
tipo de máquina, previsión de manutenciones y exportación CSV.

## 5. Maestros: estado y cierre de huecos (terminado)

| Maestro | Antes | Ahora |
| --- | --- | --- |
| `fornitori` | CRUD correcto | Sin cambios, oculto para técnicos |
| `clienti` | CRUD admin; código automático | Alta desde campo, `ultimo_manutenzione` sincronizado, código con reintento ante concurrencia |
| `macchine` | CRUD admin; marca derivada del proveedor | Marca explícita, alta desde campo, validación de pertenencia cliente-máquina |
| `marche` | Solo datos base | CRUD admin y uso en formularios |
| `pezzi` | CRUD con `intervallo_mesi` | Marca y características (`pezzi_tipi_caratteristiche`) sincronizadas |
| `tipi_caratteristiche` | CRUD sin uso | Asignación de valores a cada ricambio |
| `utenti` | Solo semilla del administrador | CRUD admin con roles y contraseña cifrada; sin exponer hashes |
| `parametros` | Inexistente (tarifa y días fijos en código) | Tabla y edición desde Configuración |
| `calendario_manutenzioni_macchine` | Tabla sin uso | Operativo, con avisos y tareas |
| `scontrini` | Inexistente | Imagen, texto, nombre detectado y vínculo a cliente/boleta |
| `manutenzioni` | Sin horas ni personas | `ore` y `persone` persistidas |
| `boletas` | Sin vínculo al scontrino | `fk_scontrino` y totales reconstruibles |

## 6. Sesión y seguridad (terminado en esta iteración)

- Refresh token opaco con rotación, caducidad y detección de reuso; el token de
  acceso sigue durando 10 minutos y ya no expulsa al usuario del flujo.
- Alcance por técnico también en el detalle, edición y borrado de interventos
  y boletas (antes solo se filtraban los listados).
- Límite específico para intentos de acceso, límite general para la API y
  validación de todos los cuerpos con Zod.
- `dateStrings` en la capa de datos: las fechas viajan como ISO y no se
  desplazan de día por la zona horaria del contenedor.

## 7. Próximas iteraciones (pendiente, con motivo)

1. **Boleta con varias máquinas en una sola emisión.** El esquema ya lo permite
   (`boletas_macchine`), pero el formulario y el servicio crean una máquina por
   boleta. Requiere decidir el reparto de horas por máquina.
2. **Precisión del OCR con scontrinos reales.** El motor local ya está
   integrado; falta medir aciertos con fotos reales de campo y, si hiciera
   falta, ajustar la heurística o añadir recorte previo de la imagen.
3. **Notificaciones fuera de la aplicación.** Hoy el aviso es la insignia y el
   panel; falta correo, WhatsApp o push para el día de vencimiento.
4. **PDF de boleta y firma del cliente.** Útil para entregar copia en sitio.
5. **Inventario/stock de ricambi.** `pezzi` es catálogo, no existencias.
6. **Roles de oficina.** `ruoli` solo distingue administrador y técnico.
7. **Modo sin conexión.** El técnico trabaja en local; falta cola de envíos.
8. **Depuración de scontrini.** Definir política de retención de imágenes.
9. **Copia de seguridad y restauración probadas** del volumen MariaDB.

## 8. Verificación

- `backend`: `npm test` ejecuta 11 pruebas de dominio y la suite de integración
  contra una base `lineabar_test` (login, refresh, maestros, flujo de campo,
  calendario, boleta, scontrino, alcance por rol, reportes y defensas).
- `frontend`: `npm test` ejecuta pruebas de dominio y un renderizado en servidor
  de login, hojas de trabajo, calendario, reportes, configuración y estados.
- `npm run build` (frontend) y `npm run verificar` (backend) cierran la
  verificación estática.
- Verificación visual en WebKit con un iPhone emulado (390 px, DPR 3, táctil,
  idioma italiano): acceso, panel, calendario, informes y los cuatro pasos de la
  boleta, sin errores de consola ni desbordes horizontales, con la hoja inferior
  por debajo de la altura visible de Safari. El tema oscuro es el valor por
  defecto y los campos mantienen 16 px para evitar el zoom automático de iOS.
