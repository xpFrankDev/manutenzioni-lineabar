-- Scontrini fotografati dai tecnici: l'immagine resta nella base per poterla
-- riconsultare, insieme al nome cliente rilevato dall'analisi assistita.
CREATE TABLE IF NOT EXISTS scontrini (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  fk_cliente BIGINT UNSIGNED NULL,
  fk_tecnico BIGINT UNSIGNED NOT NULL,
  nome_file VARCHAR(190) NOT NULL,
  tipo_mime VARCHAR(80) NOT NULL,
  dimensione INT UNSIGNED NOT NULL,
  immagine LONGBLOB NOT NULL,
  testo_estratto TEXT NULL,
  nome_rilevato VARCHAR(160) NULL,
  indirizzo_rilevato VARCHAR(255) NULL,
  citta_rilevata VARCHAR(120) NULL,
  confidenza DECIMAL(4,3) NULL,
  fornitore_analisi VARCHAR(60) NULL,
  messaggio_analisi VARCHAR(255) NULL,
  stato_analisi ENUM('in_attesa','analizzato','confermato','collegato','errore') NOT NULL DEFAULT 'in_attesa',
  creato_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificato_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  utente_crea BIGINT UNSIGNED NULL,
  utente_modifica BIGINT UNSIGNED NULL,
  stato ENUM('attivo','inattivo') NOT NULL DEFAULT 'attivo',
  FOREIGN KEY (fk_cliente) REFERENCES clienti(id),
  FOREIGN KEY (fk_tecnico) REFERENCES utenti(id)
);

CREATE INDEX IF NOT EXISTS idx_scontrini_cliente ON scontrini (fk_cliente, stato);

ALTER TABLE boletas
  ADD COLUMN IF NOT EXISTS fk_scontrino BIGINT UNSIGNED NULL AFTER fk_tecnico;

SET @existe_fk_boletas_scontrino := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'boletas'
    AND CONSTRAINT_NAME = 'fk_boletas_scontrino'
);
SET @sentencia_fk_boletas_scontrino := IF(
  @existe_fk_boletas_scontrino = 0,
  'ALTER TABLE boletas ADD CONSTRAINT fk_boletas_scontrino FOREIGN KEY (fk_scontrino) REFERENCES scontrini(id)',
  'SELECT 1'
);
PREPARE sentencia_fk_boletas_scontrino FROM @sentencia_fk_boletas_scontrino;
EXECUTE sentencia_fk_boletas_scontrino;
DEALLOCATE PREPARE sentencia_fk_boletas_scontrino;
