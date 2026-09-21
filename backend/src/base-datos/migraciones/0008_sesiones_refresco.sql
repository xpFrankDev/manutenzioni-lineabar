-- Sessioni di refresh: token opachi salvati solo come hash, con rotazione,
-- scadenza e revoca per non costringere l'utente a riaccedere ogni 10 minuti.
CREATE TABLE IF NOT EXISTS sesiones_refresco (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  fk_utente BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expira_at DATETIME NOT NULL,
  revocado_at DATETIME NULL,
  sostituido_por CHAR(64) NULL,
  agente VARCHAR(255) NULL,
  indirizzo_ip VARCHAR(45) NULL,
  creato_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificato_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  utente_crea BIGINT UNSIGNED NULL,
  utente_modifica BIGINT UNSIGNED NULL,
  stato ENUM('attivo','inattivo') NOT NULL DEFAULT 'attivo',
  FOREIGN KEY (fk_utente) REFERENCES utenti(id)
);

CREATE INDEX IF NOT EXISTS idx_sesiones_refresco_usuario
  ON sesiones_refresco (fk_utente, expira_at, revocado_at);
