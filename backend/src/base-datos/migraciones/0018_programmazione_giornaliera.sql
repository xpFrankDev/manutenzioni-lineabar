-- Programmazione giornaliera per lotti e percorso, con stato di viaggio delle
-- attività. I clienti ricevono il link Google Maps e le coordinate usate per
-- stimare gli spostamenti senza dipendere da un servizio esterno.

ALTER TABLE clienti
  ADD COLUMN IF NOT EXISTS url_mappe VARCHAR(500) NULL AFTER indirizzo,
  ADD COLUMN IF NOT EXISTS latitudine DECIMAL(9,6) NULL AFTER url_mappe,
  ADD COLUMN IF NOT EXISTS longitudine DECIMAL(9,6) NULL AFTER latitudine;

ALTER TABLE attivita
  ADD COLUMN IF NOT EXISTS fk_programmazione CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL AFTER fk_assegnato,
  ADD COLUMN IF NOT EXISTS ordine_tappa SMALLINT UNSIGNED NULL AFTER fk_programmazione,
  ADD COLUMN IF NOT EXISTS minuti_da_precedente SMALLINT UNSIGNED NULL AFTER ordine_tappa;

ALTER TABLE attivita
  MODIFY stato_attivita ENUM('aperta','in_viaggio','in_corso','completata') NOT NULL DEFAULT 'aperta';

CREATE TABLE IF NOT EXISTS programmazioni (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  data DATE NOT NULL,
  fk_tecnico CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  stato ENUM('pianificata','in_corso','completata','annullata') NOT NULL DEFAULT 'pianificata',
  max_tappe TINYINT UNSIGNED NOT NULL DEFAULT 6,
  minuti_min SMALLINT UNSIGNED NOT NULL DEFAULT 10,
  minuti_max SMALLINT UNSIGNED NOT NULL DEFAULT 30,
  origine ENUM('ia','fallback','manuale') NOT NULL DEFAULT 'manuale',
  riepilogo TEXT NULL,
  payload_ia LONGTEXT NULL,
  creato_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificato_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  utente_crea CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  utente_modifica CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  stato_registro ENUM('attivo','inattivo') NOT NULL DEFAULT 'attivo',
  FOREIGN KEY (fk_tecnico) REFERENCES utenti(id)
);

CREATE INDEX IF NOT EXISTS idx_programmazioni_data_tecnico
  ON programmazioni (data, fk_tecnico, stato);

SET @existe_fk_attivita_programmazione := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'attivita'
    AND CONSTRAINT_NAME = 'fk_attivita_programmazione'
);
SET @sentencia_fk_attivita_programmazione := IF(
  @existe_fk_attivita_programmazione = 0,
  'ALTER TABLE attivita ADD CONSTRAINT fk_attivita_programmazione FOREIGN KEY (fk_programmazione) REFERENCES programmazioni(id)',
  'SELECT 1'
);
PREPARE sentencia_fk_attivita_programmazione FROM @sentencia_fk_attivita_programmazione;
EXECUTE sentencia_fk_attivita_programmazione;
DEALLOCATE PREPARE sentencia_fk_attivita_programmazione;

UPDATE menu SET nome='Ricevute' WHERE codice='boletas';

INSERT IGNORE INTO menu (id, codice, nome, ruta, icona, ordine) VALUES
  ('10000000-0000-4000-8000-000000000009', 'programmazione', 'Programmazione', '/lineabar/programmazione', 'CalendarRange', 45);

INSERT IGNORE INTO ruoli_menu (fk_ruolo, fk_menu, puo_vedere, puo_modificare)
SELECT r.id, m.id, 1, 1
FROM ruoli r JOIN menu m
WHERE r.codice = 'amministratore' AND m.codice = 'programmazione';

INSERT IGNORE INTO ruoli_menu (fk_ruolo, fk_menu, puo_vedere, puo_modificare)
SELECT r.id, m.id, 1, 0
FROM ruoli r JOIN menu m
WHERE r.codice = 'tecnico' AND m.codice = 'programmazione';
