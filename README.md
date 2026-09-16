# Linea Bar · gestione manutenzioni

Applicazione mobile-first per registrare interventi, boletas, ricambi e pianificazione manutenzioni per Linea Bar di Gianluca Testa.

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
| `npm run dev` | backend | API con ricarica automatica. |
| `npm run migraciones` | backend | Applica le migrazioni pendenti e le registra in `migraciones_aplicadas`. |
| `npm run sembrar` | backend | Sincronizza i dati maestri; aggiunge i dati di dimostrazione se `LINEABAR_CARGAR_DEMO=1`. |
| `npm run verificar` | backend | Controllo di sintassi su tutti i file di `src/`. |

## Variabili d'ambiente

Tutte le variabili sono documentate in `.env.example` (radice, usato da Compose) e in `backend/.env.example` (sviluppo locale). Non versionare `.env` e non riutilizzare i segreti di sviluppo in produzione.

## Database

La base si chiama `lineabar`. L'applicazione usa un utente con soli permessi CRUD; migrazioni e semilla usano un secondo utente con permessi DDL limitati alla stessa base. Entrambi sono creati una sola volta da `infraestructura/mariadb/inicializar-usuarios.sh`.

Le migrazioni sono file SQL numerati in `backend/src/base-datos/migraciones/`. Il runner le applica in ordine, si interrompe al primo errore e registra ogni file applicato, quindi rieseguirlo è sicuro. Una nuova migrazione si aggiunge come file con il numero successivo: non modificare file già applicati.

## Dati di dimostrazione

`backend/src/base-datos/semillas/datos-demostracion.sql` carica clienti, macchine e registri illustrativi di settembre 2026. Serve solo allo sviluppo: in produzione si imposta `LINEABAR_CARGAR_DEMO=0`, così una nuova installazione parte con i soli dati maestri reali.

## Utente amministratore iniziale

L'utente amministratore (per difetto `dev01`) viene creato dalla semilla con la password indicata in `LINEABAR_ADMIN_PASSWORD`. La semilla confronta l'hash esistente e aggiorna la password solo se è cambiata, quindi modificare quella variabile e rieseguire l'inizializzazione è il modo previsto per ruotarla. Il file `.env` è l'unica fonte della password: nel repository non c'è nessun hash.

## Modello dati

La boleta supporta più macchine tramite `boletas_macchine`, quindi copre sia il requisito del collegamento boleta–macchina sia l'inserimento di più macchine nello stesso intervento. I ricambi usati restano in `pezzi_manutenzioni`; ciascun ricambio può definire `intervallo_mesi`. Al completamento di una manutenzione, il servizio applicativo deve aggiornare `calendario_manutenzioni_macchine.prossima_manutenzione` a partire dalla data effettiva e dalla frequenza del ricambio.

I codici sono generati nel servizio applicativo dentro una transazione: clienti privati `PRIV-0001`, clienti di un fornitore `<CODICE_FORNITORE>-0001`, boletas `BL-AAAA-MM-NNNN`. Gli indici univoci nello schema impediscono duplicati anche in caso di richieste concorrenti.

## Sicurezza

L'API non espone password in output, limita i tentativi di login, imposta header di sicurezza, valida input sul server e applica il ruolo dal JWT. Il token dura 10 minuti e non esiste ancora un refresh: dopo la scadenza l'utente torna al login.

In produzione usare HTTPS, un `JWT_SECRET` lungo e casuale, password database a privilegi minimi, la porta di MariaDB solo su loopback e storage esterno firmato per le immagini degli scontrini. L'OCR/IA va eseguito dietro un endpoint autenticato, non direttamente dal browser.

## Deployment sul VPS

Il VPS usa l'Nginx di sistema per i porti pubblici 80/443; il container frontend ascolta solo su `127.0.0.1:8091`. GitHub è la fonte del codice: non copiare i sorgenti via SSH.

1. Il repository è clonato in `/home/deploy/lineabar`. Il file `.env` resta sul server, con permessi `600`, e non viene mai sovrascritto dal deploy.
2. Il vhost condiviso vive in `/etc/nginx/codex-sites/ag-lineabar.conf` e copre sia `/animalitos/` sia `/lineabar/`. Per allinearlo al repository: `./infraestructura/despliegue/actualizar-nginx.sh`, che valida con `nginx -t` e ripristina il file precedente se la configurazione non è valida.
3. Aggiornare il codice con `./infraestructura/despliegue/actualizar.sh`: fa `git fetch`, `pull --ff-only` della rama indicata (`main` per difetto) e `docker compose up --build -d`.
4. Verificare dopo ogni aggiornamento `docker compose ps`, i log dei servizi toccati e `https://vps-5586828-x.dattaweb.com/lineabar/`.

Prima di ogni aggiornamento: verificare le migrazioni pendenti, controllare che `.env` non venga sovrascritto e avere un backup del volume `lineabar_mariadb`.
