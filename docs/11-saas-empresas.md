# 11 — SaaS modular y empresas

> **Estado: IMPLEMENTACIÓN `[V]` parcial (2026-10-22).** La empresa actual sigue
> siendo Linea Bar; la base ya admite separar datos por `fk_azienda`.

## Modelo

- `aziende` es el tenant: nombre, logo, sede, GPS del almacén y hora de salida.
- Las tablas de negocio llevan `fk_azienda`: clientes, proveedores, marcas,
  máquinas, manutenciones, recambios, características, boletas, calendario,
  actividades, scontrini, parámetros, programaciones y modelos de máquina.
- `utenti.fk_azienda` determina la empresa de la sesión. El JWT lleva
  `empresaId`; `exigirSesion` publica el contexto y todos los servicios filtran
  por él.
- Roles y menús son globales; la pertenencia y los datos son de la empresa.
- Las claves de negocio (`clienti.codice`, `macchine.codice_unico`, etc.) son
  únicas por empresa, no globalmente.
- La migración `0020_saas_empresas.sql` asigna todos los datos existentes a
  Linea Bar (`00000000-0000-4000-8000-000000000001`).

## Límites actuales

- No existe todavía un alta de empresas desde la interfaz. Se prepara por SQL o
  por un futuro panel de plataforma; el aislamiento ya está en el esquema.
- Google OAuth solo permite entrar a un email previamente autorizado. No crea
  usuarios automáticamente; el alta sigue siendo administrativa.
- La clave de Google y el redirect URI viven en el `.env` del servidor. El botón
  solo aparece si `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` están configurados.
- El logo de la empresa puede ser una URL; para recursos internos se sirve
  `/lineabar/logo-linea-bar.svg`.

## Programación con recursos

- `furgoni`: nombre, targa y capacidad de técnicos.
- `tipi_lavoro`: nombre, duración en minutos y tipo de máquina opcional.
- `programmazioni`: empresa, furgón, tipo de trabajo, número de técnicos, hora
  de salida, duración estimada y minutos totales.
- `programmazione_tecnici`: equipo asignado al lote.
- La dirección/GPS de `aziende` es el punto de salida que se usa para estimar el
  primer desplazamiento y el tiempo total.
- La UI permite seleccionar uno o varios furgones y el equipo; cada furgón
  genera un lote independiente y consume candidatos ya no disponibles.

## Audio

La entrada por voz usa la **Web Speech API del navegador**. El audio no se sube
ni se almacena en Linea Bar; el navegador puede enviarlo a su proveedor de
reconocimiento. El texto se envía a `/attivita/interpreta`, que busca cliente y
máquina dentro de la empresa y propone prioridad. Si el navegador no soporta
dictado, queda el campo de texto normal. La interfaz muestra esta declaración
junto al botón.

## Cimbali

La investigación está en `10-cimbali-api.md`: Service Square usa SAP Commerce
OCC y requiere credenciales de partner; no hay API pública documentada para
implementar sin contrato.
