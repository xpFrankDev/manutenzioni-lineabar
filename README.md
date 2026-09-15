# Linea Bar · gestione manutenzioni

Applicazione mobile-first per registrare interventi, boletas, ricambi e pianificazione manutenzioni per Linea Bar di Gianluca Testa.

## Struttura

- `frontend/`: React + Vite; base URL `/lineabar/`.
- `backend/`: API Express protetta con JWT, validazione Zod e middleware di autorizzazione.
- `backend/migrations/`: schema MariaDB versionato.
- `infraestructura/nginx/`: configurazione del reverse proxy e del fallback per le route SPA.

## Avvio locale

```bash
cd frontend
npm install
npm run dev
```

In un secondo terminale:

```bash
cd backend
cp .env.example .env
# Impostare DATABASE_URL e JWT_SECRET con valori reali.
npm install
npm run dev
```

Aprire `http://localhost:5173/lineabar/`.

## Modello dati

La boleta supporta più macchine tramite `boletas_macchine`, quindi copre sia il requisito del collegamento boleta–macchina sia l'inserimento di più macchine nello stesso intervento. I ricambi usati restano in `pezzi_manutenzioni`; ciascun ricambio può definire `intervallo_mesi`. Al completamento di una manutenzione, il servizio applicativo deve aggiornare `calendario_manutenzioni_macchine.prossima_manutenzione` a partire dalla data effettiva e dalla frequenza del ricambio.

I codici sono generati nel servizio applicativo dentro una transazione: clienti privati `PRIV-0001`, clienti di un fornitore `<CODICE_FORNITORE>-0001`, boletas `BO-AAAA-MM-NNN`. Gli indici univoci nello schema impediscono duplicati anche in caso di richieste concorrenti.

## Sicurezza

L'API non espone password in output, limita i tentativi di login, imposta header di sicurezza, valida input sul server e applica il ruolo dal JWT. In produzione usare HTTPS, un `JWT_SECRET` lungo e casuale, una password database a privilegi minimi e storage esterno firmato per immagini degli scontrini. L'OCR/IA va eseguito dietro un endpoint autenticato, non direttamente dal browser.
