-- Fotos de máquina y control de acceso por usuario a la ficha de máquina.
-- Las fotos viven en el volumen MariaDB (misma copia de seguridad que el resto
-- de datos) y solo se sirven por endpoints autenticados.

CREATE TABLE IF NOT EXISTS macchine_foto (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  fk_macchina CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  nome_file VARCHAR(190) NOT NULL,
  tipo_mime VARCHAR(80) NOT NULL,
  dimensione INT UNSIGNED NOT NULL,
  immagine LONGBLOB NOT NULL,
  didascalia VARCHAR(255) NULL,
  ordine INT UNSIGNED NOT NULL DEFAULT 0,
  creato_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificato_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  utente_crea CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  utente_modifica CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  stato ENUM('attivo','inattivo') NOT NULL DEFAULT 'attivo',
  FOREIGN KEY (fk_macchina) REFERENCES macchine(id)
);

CREATE INDEX IF NOT EXISTS idx_macchine_foto_macchina
  ON macchine_foto (fk_macchina, stato, ordine);

CREATE TABLE IF NOT EXISTS macchine_utenti (
  fk_macchina CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  fk_utente CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  creato_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificato_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  utente_crea CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  utente_modifica CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  stato ENUM('attivo','inattivo') NOT NULL DEFAULT 'attivo',
  PRIMARY KEY (fk_macchina, fk_utente),
  FOREIGN KEY (fk_macchina) REFERENCES macchine(id),
  FOREIGN KEY (fk_utente) REFERENCES utenti(id)
);

CREATE INDEX IF NOT EXISTS idx_macchine_utenti_usuario
  ON macchine_utenti (fk_utente, stato);

-- Accesos históricos: manutenciones, boletas y tareas ya registradas.
INSERT IGNORE INTO macchine_utenti (fk_macchina, fk_utente, utente_crea, utente_modifica)
SELECT DISTINCT mm.fk_macchina, m.fk_tecnico, m.utente_crea, m.utente_modifica
FROM macchine_manutenzioni mm
JOIN manutenzioni m ON m.id = mm.fk_manutenzione
WHERE m.fk_tecnico IS NOT NULL AND m.stato = 'attivo';

INSERT IGNORE INTO macchine_utenti (fk_macchina, fk_utente, utente_crea, utente_modifica)
SELECT DISTINCT bmq.fk_macchina, b.fk_tecnico, b.utente_crea, b.utente_modifica
FROM boletas_macchine bmq
JOIN boletas b ON b.id = bmq.fk_boleta
WHERE b.fk_tecnico IS NOT NULL AND b.stato <> 'annullata';

INSERT IGNORE INTO macchine_utenti (fk_macchina, fk_utente, utente_crea, utente_modifica)
SELECT DISTINCT a.fk_macchina, at.fk_tecnico, at.utente_crea, at.utente_modifica
FROM attivita a
JOIN attivita_tecnici at ON at.fk_attivita = a.id
WHERE a.fk_macchina IS NOT NULL AND a.stato = 'attivo' AND at.stato = 'attivo';

-- El creador técnico de una máquina conserva acceso a su ficha.
INSERT IGNORE INTO macchine_utenti (fk_macchina, fk_utente, utente_crea, utente_modifica)
SELECT m.id, m.utente_crea, m.utente_crea, m.utente_modifica
FROM macchine m
JOIN utenti u ON u.id = m.utente_crea
JOIN ruoli r ON r.id = u.fk_ruolo
WHERE r.codice = 'tecnico' AND m.utente_crea IS NOT NULL;
