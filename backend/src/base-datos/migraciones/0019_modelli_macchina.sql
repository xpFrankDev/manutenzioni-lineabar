-- Catalogo dei modelli di macchina usati dai clienti, con immagine principale
-- e scheda del produttore. Non sostituisce la macchina installata: è il
-- riferimento commerciale per riconoscere modello, marca e categoria.

CREATE TABLE IF NOT EXISTS modelli_macchina (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  fk_marca CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  nome VARCHAR(120) NOT NULL,
  tipo_macchina ENUM('macchina_caffe','produttore_ghiaccio','lavastoviglie','filtro','addolcitore') NOT NULL,
  immagine_url VARCHAR(1000) NULL,
  scheda_url VARCHAR(1000) NULL,
  note VARCHAR(255) NULL,
  creato_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificato_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  utente_crea CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  utente_modifica CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  stato ENUM('attivo','inattivo') NOT NULL DEFAULT 'attivo',
  UNIQUE KEY uq_modelli_marca_nome (fk_marca, nome),
  FOREIGN KEY (fk_marca) REFERENCES marche(id)
);

CREATE INDEX IF NOT EXISTS idx_modelli_tipo ON modelli_macchina (tipo_macchina, stato);

INSERT IGNORE INTO ruoli_menu (fk_ruolo, fk_menu, puo_vedere, puo_modificare)
SELECT r.id, m.id, 1, 1
FROM ruoli r JOIN menu m
WHERE r.codice = 'amministratore' AND m.codice = 'configuracion';
