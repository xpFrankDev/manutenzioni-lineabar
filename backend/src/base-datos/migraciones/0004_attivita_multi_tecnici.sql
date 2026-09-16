-- Procede de backend/migrations/006_attivita_multi_tecnici.sql.
ALTER TABLE attivita
  ADD COLUMN IF NOT EXISTS osservazione TEXT NULL AFTER titolo,
  ADD COLUMN IF NOT EXISTS richiede_appuntamento TINYINT(1) NOT NULL DEFAULT 0 AFTER osservazione,
  ADD COLUMN IF NOT EXISTS descrizione_chiusura TEXT NULL AFTER stato_attivita,
  ADD COLUMN IF NOT EXISTS fk_manutenzione_chiusura BIGINT UNSIGNED NULL AFTER descrizione_chiusura;

CREATE TABLE IF NOT EXISTS attivita_tecnici (
  fk_attivita BIGINT UNSIGNED NOT NULL,
  fk_tecnico BIGINT UNSIGNED NOT NULL,
  creato_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificato_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  utente_crea BIGINT UNSIGNED NULL,
  utente_modifica BIGINT UNSIGNED NULL,
  stato ENUM('attivo','inattivo') NOT NULL DEFAULT 'attivo',
  PRIMARY KEY (fk_attivita,fk_tecnico),
  FOREIGN KEY (fk_attivita) REFERENCES attivita(id),
  FOREIGN KEY (fk_tecnico) REFERENCES utenti(id)
);

INSERT IGNORE INTO attivita_tecnici (fk_attivita,fk_tecnico,utente_crea,utente_modifica)
SELECT id,fk_assegnato,utente_crea,utente_modifica FROM attivita WHERE fk_assegnato IS NOT NULL;
