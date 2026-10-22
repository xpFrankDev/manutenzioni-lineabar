-- SaaS modular: empresa (tenant), aislamiento por fk_azienda, recursos de
-- programación (furgones, tipos de trabajo) y campos de prioridad explicada.
-- La empresa existente se conserva como Linea Bar; el resto de empresas parte
-- sin datos compartidos.

CREATE TABLE IF NOT EXISTS aziende (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  codice VARCHAR(40) NOT NULL UNIQUE,
  nome VARCHAR(160) NOT NULL,
  logo_url VARCHAR(1000) NULL,
  indirizzo VARCHAR(255) NULL,
  citta VARCHAR(120) NULL,
  latitudine DECIMAL(9,6) NULL,
  longitudine DECIMAL(9,6) NULL,
  ora_partenza TIME NOT NULL DEFAULT '08:00:00',
  email VARCHAR(190) NULL,
  telefono VARCHAR(40) NULL,
  sito_url VARCHAR(500) NULL,
  creato_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificato_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  utente_crea CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  utente_modifica CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  stato ENUM('attivo','inattivo') NOT NULL DEFAULT 'attivo'
);

INSERT IGNORE INTO aziende
  (id, codice, nome, logo_url, indirizzo, citta, latitudine, longitudine, ora_partenza, stato)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'LINEABAR', 'Linea Bar',
   '/lineabar/logo-linea-bar.svg', 'L’Aquila', 'L’Aquila', 42.349800, 13.399500, '08:00:00', 'attivo');

-- Tablas de negocio: se añade la empresa y se asignan los datos existentes a
-- Linea Bar. La columna se mantiene NOT NULL para impedir filas huérfanas.
ALTER TABLE utenti ADD COLUMN IF NOT EXISTS fk_azienda CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001' AFTER id;
ALTER TABLE utenti ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255) NULL AFTER password_hash;
CREATE UNIQUE INDEX IF NOT EXISTS uq_utenti_google_sub ON utenti (google_sub);
ALTER TABLE fornitori ADD COLUMN IF NOT EXISTS fk_azienda CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001' AFTER id;
ALTER TABLE clienti ADD COLUMN IF NOT EXISTS fk_azienda CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001' AFTER id;
ALTER TABLE marche ADD COLUMN IF NOT EXISTS fk_azienda CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001' AFTER id;
ALTER TABLE macchine ADD COLUMN IF NOT EXISTS fk_azienda CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001' AFTER id;
ALTER TABLE manutenzioni ADD COLUMN IF NOT EXISTS fk_azienda CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001' AFTER id;
ALTER TABLE pezzi ADD COLUMN IF NOT EXISTS fk_azienda CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001' AFTER id;
ALTER TABLE tipi_caratteristiche ADD COLUMN IF NOT EXISTS fk_azienda CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001' AFTER id;
ALTER TABLE boletas ADD COLUMN IF NOT EXISTS fk_azienda CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001' AFTER id;
ALTER TABLE calendario_manutenzioni_macchine ADD COLUMN IF NOT EXISTS fk_azienda CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001' AFTER id;
ALTER TABLE attivita ADD COLUMN IF NOT EXISTS fk_azienda CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001' AFTER id;
ALTER TABLE scontrini ADD COLUMN IF NOT EXISTS fk_azienda CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001' AFTER id;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS fk_azienda CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001' AFTER id;
ALTER TABLE programmazioni ADD COLUMN IF NOT EXISTS fk_azienda CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001' AFTER id;
ALTER TABLE modelli_macchina ADD COLUMN IF NOT EXISTS fk_azienda CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001' AFTER id;

-- Prioridad automática explicada y tipo de trabajo de la tarea.
ALTER TABLE attivita
  ADD COLUMN IF NOT EXISTS motivo_priorita VARCHAR(500) NULL AFTER priorita,
  ADD COLUMN IF NOT EXISTS priorita_auto TINYINT(1) NOT NULL DEFAULT 0 AFTER motivo_priorita,
  ADD COLUMN IF NOT EXISTS fk_tipo_lavoro CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL AFTER fk_programmazione,
  ADD COLUMN IF NOT EXISTS durata_stimata_minuti SMALLINT UNSIGNED NULL AFTER motivo_priorita;

-- Parámetros de la programación: vehículo, tipo de trabajo, jornada y capacidad.
ALTER TABLE programmazioni
  ADD COLUMN IF NOT EXISTS fk_furgone CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL AFTER fk_tecnico,
  ADD COLUMN IF NOT EXISTS fk_tipo_lavoro CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL AFTER fk_furgone,
  ADD COLUMN IF NOT EXISTS numero_tecnici TINYINT UNSIGNED NOT NULL DEFAULT 1 AFTER fk_tipo_lavoro,
  ADD COLUMN IF NOT EXISTS ora_partenza TIME NOT NULL DEFAULT '08:00:00' AFTER numero_tecnici,
  ADD COLUMN IF NOT EXISTS durata_stimata_minuti SMALLINT UNSIGNED NULL AFTER ora_partenza,
  ADD COLUMN IF NOT EXISTS minuti_totali SMALLINT UNSIGNED NULL AFTER durata_stimata_minuti;

CREATE TABLE IF NOT EXISTS furgoni (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  fk_azienda CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  nome VARCHAR(100) NOT NULL,
  targa VARCHAR(30) NULL,
  capacita_tecnici TINYINT UNSIGNED NOT NULL DEFAULT 1,
  note VARCHAR(255) NULL,
  creato_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificato_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  utente_crea CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  utente_modifica CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  stato ENUM('attivo','inattivo') NOT NULL DEFAULT 'attivo',
  UNIQUE KEY uq_furgoni_azienda_nome (fk_azienda, nome),
  FOREIGN KEY (fk_azienda) REFERENCES aziende(id)
);

CREATE TABLE IF NOT EXISTS tipi_lavoro (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  fk_azienda CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  codice VARCHAR(40) NOT NULL,
  nome VARCHAR(120) NOT NULL,
  durata_minuti SMALLINT UNSIGNED NOT NULL DEFAULT 90,
  tipo_macchina ENUM('macchina_caffe','produttore_ghiaccio','lavastoviglie','filtro','addolcitore') NULL,
  note VARCHAR(255) NULL,
  creato_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificato_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  utente_crea CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  utente_modifica CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  stato ENUM('attivo','inattivo') NOT NULL DEFAULT 'attivo',
  UNIQUE KEY uq_tipi_lavoro_azienda_codice (fk_azienda, codice),
  FOREIGN KEY (fk_azienda) REFERENCES aziende(id)
);

CREATE TABLE IF NOT EXISTS programmazione_tecnici (
  fk_programmazione CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  fk_tecnico CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  creato_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  utente_crea CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (fk_programmazione, fk_tecnico),
  FOREIGN KEY (fk_programmazione) REFERENCES programmazioni(id),
  FOREIGN KEY (fk_tecnico) REFERENCES utenti(id)
);

INSERT IGNORE INTO furgoni (id, fk_azienda, nome, targa, capacita_tecnici)
VALUES ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', 'Furgone 1', NULL, 2);

INSERT IGNORE INTO tipi_lavoro (id, fk_azienda, codice, nome, durata_minuti)
VALUES
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000001', 'MANUTENZIONE', 'Manutenzione ordinaria', 90),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000001', 'URGENZA', 'Intervento urgente', 60),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000001', 'INSTALLAZIONE', 'Installazione', 180);

-- Índices de aislamiento.
CREATE INDEX IF NOT EXISTS idx_utenti_azienda ON utenti (fk_azienda, stato);
CREATE INDEX IF NOT EXISTS idx_fornitori_azienda ON fornitori (fk_azienda, stato);
CREATE INDEX IF NOT EXISTS idx_clienti_azienda ON clienti (fk_azienda, stato);
CREATE INDEX IF NOT EXISTS idx_marche_azienda ON marche (fk_azienda, stato);
CREATE INDEX IF NOT EXISTS idx_macchine_azienda ON macchine (fk_azienda, stato);
CREATE INDEX IF NOT EXISTS idx_manutenzioni_azienda ON manutenzioni (fk_azienda, data);
CREATE INDEX IF NOT EXISTS idx_pezzi_azienda ON pezzi (fk_azienda, stato);
CREATE INDEX IF NOT EXISTS idx_tipi_caratteristiche_azienda ON tipi_caratteristiche (fk_azienda, stato);
CREATE INDEX IF NOT EXISTS idx_boletas_azienda ON boletas (fk_azienda, data);
CREATE INDEX IF NOT EXISTS idx_calendario_azienda ON calendario_manutenzioni_macchine (fk_azienda, prossima_manutenzione);
CREATE INDEX IF NOT EXISTS idx_attivita_azienda ON attivita (fk_azienda, stato, stato_attivita);
CREATE INDEX IF NOT EXISTS idx_scontrini_azienda ON scontrini (fk_azienda, stato);
CREATE INDEX IF NOT EXISTS idx_parametros_azienda ON parametros (fk_azienda, chiave);
CREATE INDEX IF NOT EXISTS idx_programmazioni_azienda ON programmazioni (fk_azienda, data, stato);
CREATE INDEX IF NOT EXISTS idx_modelli_azienda ON modelli_macchina (fk_azienda, stato);

-- Las claves de negocio son únicas por empresa, no globalmente.
ALTER TABLE fornitori DROP INDEX codice, ADD UNIQUE KEY uq_fornitori_azienda_codice (fk_azienda, codice);
ALTER TABLE clienti DROP INDEX codice, ADD UNIQUE KEY uq_clienti_azienda_codice (fk_azienda, codice);
ALTER TABLE macchine DROP INDEX codice_unico, ADD UNIQUE KEY uq_macchine_azienda_codice (fk_azienda, codice_unico);
ALTER TABLE marche DROP INDEX nome, ADD UNIQUE KEY uq_marche_azienda_nome (fk_azienda, nome);
ALTER TABLE boletas DROP INDEX codice_boleta, ADD UNIQUE KEY uq_boletas_azienda_codice (fk_azienda, codice_boleta);
ALTER TABLE pezzi DROP INDEX codice_unico, ADD UNIQUE KEY uq_pezzi_azienda_codice (fk_azienda, codice_unico);
ALTER TABLE tipi_caratteristiche DROP INDEX codice_unico, ADD UNIQUE KEY uq_tipi_caratteristiche_azienda_codice (fk_azienda, codice_unico);
ALTER TABLE parametros DROP INDEX chiave, ADD UNIQUE KEY uq_parametros_azienda_chiave (fk_azienda, chiave);

-- Claves foráneas a la empresa.
SET @tablas_empresa = 'utenti,fornitori,clienti,marche,macchine,manutenzioni,pezzi,tipi_caratteristiche,boletas,calendario_manutenzioni_macchine,attivita,scontrini,parametros,programmazioni,modelli_macchina';
-- Se declaran explícitamente para que el error de una tabla no oculte las demás.
ALTER TABLE utenti ADD CONSTRAINT fk_utenti_azienda FOREIGN KEY (fk_azienda) REFERENCES aziende(id);
ALTER TABLE fornitori ADD CONSTRAINT fk_fornitori_azienda FOREIGN KEY (fk_azienda) REFERENCES aziende(id);
ALTER TABLE clienti ADD CONSTRAINT fk_clienti_azienda FOREIGN KEY (fk_azienda) REFERENCES aziende(id);
ALTER TABLE marche ADD CONSTRAINT fk_marche_azienda FOREIGN KEY (fk_azienda) REFERENCES aziende(id);
ALTER TABLE macchine ADD CONSTRAINT fk_macchine_azienda FOREIGN KEY (fk_azienda) REFERENCES aziende(id);
ALTER TABLE manutenzioni ADD CONSTRAINT fk_manutenzioni_azienda FOREIGN KEY (fk_azienda) REFERENCES aziende(id);
ALTER TABLE pezzi ADD CONSTRAINT fk_pezzi_azienda FOREIGN KEY (fk_azienda) REFERENCES aziende(id);
ALTER TABLE tipi_caratteristiche ADD CONSTRAINT fk_tipi_caratteristiche_azienda FOREIGN KEY (fk_azienda) REFERENCES aziende(id);
ALTER TABLE boletas ADD CONSTRAINT fk_boletas_azienda FOREIGN KEY (fk_azienda) REFERENCES aziende(id);
ALTER TABLE calendario_manutenzioni_macchine ADD CONSTRAINT fk_calendario_azienda FOREIGN KEY (fk_azienda) REFERENCES aziende(id);
ALTER TABLE attivita ADD CONSTRAINT fk_attivita_azienda FOREIGN KEY (fk_azienda) REFERENCES aziende(id);
ALTER TABLE scontrini ADD CONSTRAINT fk_scontrini_azienda FOREIGN KEY (fk_azienda) REFERENCES aziende(id);
ALTER TABLE parametros ADD CONSTRAINT fk_parametros_azienda FOREIGN KEY (fk_azienda) REFERENCES aziende(id);
ALTER TABLE programmazioni ADD CONSTRAINT fk_programmazioni_azienda FOREIGN KEY (fk_azienda) REFERENCES aziende(id);
ALTER TABLE modelli_macchina ADD CONSTRAINT fk_modelli_azienda FOREIGN KEY (fk_azienda) REFERENCES aziende(id);

-- Tareas ya vencidas más de 30 días: prioridad alta y explicación persistida.
UPDATE attivita
SET priorita='alta',
    priorita_auto=1,
    motivo_priorita=CONCAT('Manutenzione scaduta da ', DATEDIFF(CURDATE(), scadenza), ' giorni (oltre 30): priorità alta automatica.'),
    utente_modifica=NULL
WHERE scadenza IS NOT NULL
  AND scadenza < DATE_SUB(CURDATE(), INTERVAL 30 DAY)
  AND stato_attivita <> 'completata'
  AND stato='attivo';
