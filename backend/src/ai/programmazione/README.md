# Programmazione assistita

Questa cartella contiene solo il contratto e le istruzioni del pianificatore.
Il backend non incorpora un motore IA: invia i dati minimi a un endpoint
compatibile con Chat Completions e valida la risposta con Zod.

## File

- `instrucciones.md`: prompt di sistema in italiano tecnico.
- `contrato.json`: forma dell'input e dell'output.
- `servicio.js`: chiamata HTTP, timeout, parsing e controllo degli ID.

## Configurazione segreta

Le variabili si leggono solo dall'ambiente del server (`.env` sul VPS, mai nel
repository):

- `LINEABAR_AI_ENDPOINT`: URL completo dell'endpoint (predefinito OpenCode Go).
- `LINEABAR_AI_API_KEY`: chiave segreta; non viene registrata né restituita.
- `LINEABAR_AI_MODELO`: modello base, per esempio `deepseek-v4.1-flash`.
- `LINEABAR_AI_REASONING_EFFORT`: `low`, `high` o `max`. Se el modelo se
escribe como `deepseek-v4.1-flash#high`, el backend separa la variante y envía
`reasoning_effort=high`; el ID enviado a la API no lleva `#`.
- `LINEABAR_AI_TIEMPO_LIMITE_MS`: timeout della chiamata.

Se endpoint o chiave mancano, il servizio usa il pianificatore locale
deterministico e salva `origine=fallback`. La chiave non deve mai essere inserita
nel frontend o in un tag NFC.
