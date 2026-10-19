# Linea Bar · gestione manutenzioni

Applicazione mobile-first per registrare interventi, boletas, ricambi e pianificazione manutenzioni per Linea Bar di Gianluca Testa.

## Documentazione

Lo stato del progetto, l'architettura, la sicurezza, la verifica e le decisioni
aperte vivono in `docs/` (entrata: `docs/00-indice.md`). Il piano successivo al
roadmap è `docs/09-post-roadmap.md`. `ROADMAP.md` resta come registro storico.

## Struttura

- `frontend/`: React + Vite, tema chiaro/scuro e catalogo i18n italiano/spagnolo. Codice organizzato in `app/`, `compartido/` e `funcionalidades/`.
- `backend/`: API Express con JWT, validazione Zod e moduli per dominio in `src/modulos/`.
- `backend/src/base-datos/migraciones/`: schema MariaDB versionato, applicato una sola volta per database.
- `backend/src/base-datos/semillas/`: dati maestri e dati di dimostrazione separati.
- `infraestructura/`: inizializzazione di MariaDB, vhost Nginx del server e script di aggiornamento.

## Requisiti

- Docker e Docker Compose (percorso consigliato).
- Node.js 22 solo per lo sviluppo locale senza container.

## Avvio locale con Docker

```bash
cp .env.example .env
# Sostituire ogni segreto e lasciare LINEABAR_CARGAR_DEMO=1 in locale.
docker compose up --build -d
```

Compose avvia MariaDB, applica migrazioni e semilla, poi pubblica l'applicazione su `http://localhost:8091/lineabar/` (solo loopback; l'Nginx del server espone il traffico pubblico).

Per vedere l'avvio e gli errori: `docker compose logs -f`. Per fermare tutto: `docker compose down`. I dati restano nel volume `lineabar_mariadb`; `docker compose down -v` li elimina deliberatamente.

## Avvio locale senza Docker

Con MariaDB già raggiungibile (per esempio il container con `LINEABAR_DB_PORT=3308`):

```bash
cd backend
cp .env.example .env
# Impostare DB_PORT=3308, MARIADB_DATABASE, LINEABAR_DB_USER, LINEABAR_DB_PASSWORD e JWT_SECRET.
npm install
npm run migraciones && npm run sembrar
npm run dev
```

In un secondo terminale:

```bash
cd frontend
npm install
npm run dev
```

Vite serve `http://localhost:5173/lineabar/` e inoltra `/lineabar/api` al backend su `http://localhost:3001`.

## Script disponibili

| Comando | Dove | Descrizione |
| --- | --- | --- |
| `npm run dev` | frontend | Server di sviluppo Vite con proxy verso l'API. |
| `npm run build` | frontend | Build di produzione in `frontend/dist`. |
| `npm test` | frontend | Test di dominio e render delle schermate con Node. |
| `npm run dev` | backend | API con ricarica automatica. |
| `npm run migraciones` | backend | Applica le migrazioni pendenti e le registra in `migraciones_aplicadas`. |
| `npm run sembrar` | backend | Sincronizza i dati maestri; aggiunge i dati di dimostrazione se `LINEABAR_CARGAR_DEMO=1`. |
| `npm run verificar` | backend | Controllo di sintassi su tutti i file di `src/`. |
| `npm test` | backend | Test di dominio e suite di integrazione (richiede la base `lineabar_test`). |

## Test

Il backend usa il runner nativo di Node. I test di unità non richiedono un
database:

```bash
cd backend
npm run test:unidad
```

La suite di integrazione ricrea una base dedicata (`lineabar_test`), applica
migrazioni e semilla e verifica accesso, refresh, dati maestri, flusso di campo,
calendario, boleta, scontrino, permessi per ruolo, report e difese di sicurezza.
Lo stesso controllo gira in GitHub Actions (`.github/workflows/verificacion.yml`):

```bash
cd backend
set -a; . ../.env; set +a
export DB_HOST=127.0.0.1 DB_PORT=3308 MARIADB_DATABASE=lineabar_test
export LINEABAR_TEST_ADMIN_PASSWORD=cambia_esta_contrasena
npm test
```

`tests/preparar-base.js` rifiuta di toccare qualsiasi base il cui nome non
inizi con `lineabar_test`.

## Variabili d'ambiente

Tutte le variabili sono documentate in `.env.example` (radice, usato da Compose) e in `backend/.env.example` (sviluppo locale). Non versionare `.env` e non riutilizzare i segreti di sviluppo in produzione.

## Database

La base si chiama `lineabar`. L'applicazione usa un utente con soli permessi CRUD; migrazioni e semilla usano un secondo utente con permessi DDL limitati alla stessa base. Entrambi sono creati una sola volta da `infraestructura/mariadb/inicializar-usuarios.sh`.

Tutte le chiavi primarie e forzate sono **UUID** (`CHAR(36)`): nessuna entità si
relaziona tramite un numero correlativo. La migrazione `0010_uuid_identificadores.js`
converte una base esistente conservando i dati. Per conoscere quante righe ha ogni
tabella senza modificare nulla: `cd backend && npm run datos:estado`.

Ogni macchina ha una **ficha** (`/lineabar/macchine/<uuid>`) con foto caricate nel
volume MariaDB, dati di cliente e fornitore, storico manutenzioni con o senza
boleta, link per NFC e gestione degli accessi per tecnico. La ficha e le foto
richiedono sessione e autorizzazione: senza sessione si viene portati al login e
senza permesso si mostra una pagina 403; un link inesistente mostra la 404.

Le migrazioni sono file SQL numerati in `backend/src/base-datos/migraciones/`. Il runner le applica in ordine, si interrompe al primo errore e registra ogni file applicato, quindi rieseguirlo è sicuro. Una nuova migrazione si aggiunge come file con il numero successivo: non modificare file già applicati.

## Dati di dimostrazione

`backend/src/base-datos/semillas/datos-demostracion.sql` carica clienti, macchine e registri illustrativi di settembre 2026. Serve solo allo sviluppo: in produzione si imposta `LINEABAR_CARGAR_DEMO=0`, così una nuova installazione parte con i soli dati maestri reali.

## Utente amministratore iniziale

L'utente amministratore (per difetto `dev01`) viene creato dalla semilla con la password indicata in `LINEABAR_ADMIN_PASSWORD`. La semilla confronta l'hash esistente e aggiorna la password solo se è cambiata, quindi modificare quella variabile e rieseguire l'inizializzazione è il modo previsto per ruotarla. Il file `.env` è l'unica fonte della password: nel repository non c'è nessun hash.

## Modello dati

La boleta supporta più macchine tramite `boletas_macchine`, quindi copre sia il requisito del collegamento boleta–macchina sia l'inserimento di più macchine nello stesso intervento. I ricambi usati restano in `pezzi_manutenzioni`; ciascun ricambio può definire `intervallo_mesi`. Al completamento di una manutenzione, il servizio applicativo deve aggiornare `calendario_manutenzioni_macchine.prossima_manutenzione` a partire dalla data effettiva e dalla frequenza del ricambio.

Il flusso di campo è: **cliente → macchina del cliente → ricambi e manodopera →
riepilogo**. Il cliente e la macchina si possono creare senza uscire dal
modulo; ore e persone vengono salvate in `manutenzioni`; la manutenzione
successiva si programma in `calendario_manutenzioni_macchine` e alimenta gli
avvisi del pannello e la pagina Calendario.

Altre tabelle operative:

- `scontrini`: immagine dello scontrino, testo estratto, nome cliente rilevato e
  collegamento a cliente e boleta. La foto resta nella base per poterla
  riconsultare.
- `sesiones_refresco`: sessioni di refresh (solo hash del token) con rotazione e
  revoca.
- `parametros`: tarifa oraria della manodopera, giorni di avviso del calendario,
  orizzonte e mesi di previsione dei report. Si modificano da Configurazione.

## Calendario e avvisi

Ogni ricambio con `intervallo_mesi` rinnova la programmazione della macchina
quando viene usato in un intervento o in una boleta. La pagina
`/lineabar/calendario` filtra per vencute, in scadenza, programmate e sospese;
dal dettaglio un amministratore può programmare l'attività per un tecnico,
riprogrammare data e frequenza o sospendere la voce. La navigazione mostra il
numero di manutenzioni da gestire e il pannello espone le più urgenti.

## Report

`/lineabar/reportes` riassume il mese: boletas emesse, ricavi, boleta media,
interventi, ore uomo, manodopera valorizzata, ricambi consumati, clienti
serviti, ricavi per cliente, ricambi più usati, interventi per tipo di macchina,
previsione dei mesi successivi ed esportazione CSV delle boletas del periodo.

## Scontrino assistito

Il pulsante «Scansiona lo scontrino» salva la foto e tenta di leggere il nome
del cliente. Se il cliente è già in base viene proposto; altrimenti si crea
dalla foto. L'analisi è **locale e gratuita**: Tesseract (tesseract.js) gira sul
server con i dati di lingua italiana inclusi nel progetto, quindi non serve
alcuna API a pagamento. La lettura può essere migliorata impostando
`LINEABAR_OCR_PROVEEDOR=openai` con `LINEABAR_OCR_ENDPOINT`,
`LINEABAR_OCR_API_KEY` e `LINEABAR_OCR_MODELO` (opzionale). Con
`LINEABAR_OCR_PROVEEDOR=ninguno` la foto viene comunque salvata e il tecnico
conferma il nome a mano.

I codici sono generati nel servizio applicativo dentro una transazione: clienti privati `PRIV-0001`, clienti di un fornitore `<CODICE_FORNITORE>-0001`, boletas `BL-AAAA-MM-NNNN`. Gli indici univoci nello schema impediscono duplicati anche in caso di richieste concorrenti.

## Sicurezza

L'API non espone password in output, limita i tentativi di login, imposta header di sicurezza, valida input sul server e applica il ruolo dal JWT. Il token di accesso dura 10 minuti; la sessione si rinnova con un refresh token opaco ruotato a ogni uso, salvato solo come hash e revocato in caso di riuso sospetto, quindi l'utente non torna al login durante il lavoro in campo. Il ruolo limita anche lettura, modifica e annullamento di interventi e boletas ai tecnici che li hanno registrati.

Stato e limiti reali sono in `docs/04-seguridad.md`: dopo la revisione del
2026-10-19 la sessione viaggia in cookie `HttpOnly` con CSRF in memoria e il
client non conserva più token in `localStorage`. `TRUST_PROXY_HOPS` deve riflettere
i due Nginx davanti all'API, altrimenti il limite di accesso non è per cliente. Il
SPA applica una CSP stretta e il CSV neutralizza le formule. Le decisioni aperte
sono in `docs/07-decisiones-abiertas.md`.

In produzione usare HTTPS, un `JWT_SECRET` lungo e casuale, password database a privilegi minimi e la porta di MariaDB solo su loopback. Le immagini degli scontrini restano nella base per semplicità di backup: se il volume cresce, conviene spostarle su storage esterno firmato mantenendo la stessa tabella. L'analisi OCR/IA va eseguita dietro un endpoint autenticato, non direttamente dal browser.

## Deployment sul VPS

Il VPS usa l'Nginx di sistema per i porti pubblici 80/443; il container frontend ascolta solo su `127.0.0.1:8091`. GitHub è la fonte del codice: non copiare i sorgenti via SSH.

1. Il repository è clonato in `/home/deploy/lineabar`. Il file `.env` resta sul server, con permessi `600`, e non viene mai sovrascritto dal deploy.
2. Il vhost condiviso vive in `/etc/nginx/codex-sites/ag-lineabar.conf` e copre sia `/animalitos/` sia `/lineabar/`. Per allinearlo al repository: `./infraestructura/despliegue/actualizar-nginx.sh`, che valida con `nginx -t` e ripristina il file precedente se la configurazione non è valida.
3. Aggiornare il codice con `./infraestructura/despliegue/actualizar.sh`: fa `git fetch`, `pull --ff-only` della rama indicata (`main` per difetto) e `docker compose up --build -d`.
4. Verificare dopo ogni aggiornamento `docker compose ps`, i log dei servizi toccati e `https://vps-5586828-x.dattaweb.com/lineabar/`.

Prima di ogni aggiornamento: verificare le migrazioni pendenti, controllare che `.env` non venga sovrascritto e avere un backup del volume `lineabar_mariadb`.
