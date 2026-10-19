-- Menù applicativo e permessi modulari per ruolo.
-- `utenti.fk_ruolo` ya relaciona usuario y rol; `ruoli_menu` relaciona cada rol
-- con los menús que puede ver y modificar.

CREATE TABLE IF NOT EXISTS menu (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  codice VARCHAR(40) NOT NULL UNIQUE,
  nome VARCHAR(80) NOT NULL,
  ruta VARCHAR(120) NOT NULL,
  icona VARCHAR(40) NULL,
  ordine INT NOT NULL DEFAULT 0,
  creato_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificato_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  utente_crea CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  utente_modifica CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  stato ENUM('attivo','inattivo') NOT NULL DEFAULT 'attivo'
);

CREATE TABLE IF NOT EXISTS ruoli_menu (
  fk_ruolo CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  fk_menu CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  puo_vedere TINYINT(1) NOT NULL DEFAULT 1,
  puo_modificare TINYINT(1) NOT NULL DEFAULT 0,
  creato_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificato_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  utente_crea CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  utente_modifica CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  stato ENUM('attivo','inattivo') NOT NULL DEFAULT 'attivo',
  PRIMARY KEY (fk_ruolo, fk_menu),
  FOREIGN KEY (fk_ruolo) REFERENCES ruoli(id),
  FOREIGN KEY (fk_menu) REFERENCES menu(id)
);

CREATE INDEX IF NOT EXISTS idx_ruoli_menu_menu ON ruoli_menu (fk_menu, stato);

INSERT IGNORE INTO menu (id, codice, nome, ruta, icona, ordine) VALUES
  ('10000000-0000-4000-8000-000000000001', 'dashboard', 'Panoramica', '/lineabar/dashboard', 'LayoutDashboard', 10),
  ('10000000-0000-4000-8000-000000000002', 'boletas', 'Boletas', '/lineabar/boletas', 'ReceiptText', 20),
  ('10000000-0000-4000-8000-000000000003', 'mantenimientos', 'Interventi', '/lineabar/mantenimientos', 'Wrench', 30),
  ('10000000-0000-4000-8000-000000000004', 'calendario', 'Calendario', '/lineabar/calendario', 'CalendarClock', 40),
  ('10000000-0000-4000-8000-000000000005', 'tareas', 'Attività', '/lineabar/tareas', 'ClipboardList', 50),
  ('10000000-0000-4000-8000-000000000006', 'macchine', 'Macchine', '/lineabar/macchine', 'Boxes', 60),
  ('10000000-0000-4000-8000-000000000007', 'reportes', 'Report', '/lineabar/reportes', 'BarChart3', 70),
  ('10000000-0000-4000-8000-000000000008', 'configuracion', 'Impostazioni', '/lineabar/configuracion', 'Settings', 80);

-- El administrador conserva todas las opciones.
INSERT IGNORE INTO ruoli_menu (fk_ruolo, fk_menu, puo_vedere, puo_modificare)
SELECT r.id, m.id, 1, 1
FROM ruoli r JOIN menu m
WHERE r.codice = 'amministratore' AND m.stato = 'attivo';

-- El técnico parte con las opciones de campo; el administrador puede cambiarlas.
INSERT IGNORE INTO ruoli_menu (fk_ruolo, fk_menu, puo_vedere, puo_modificare)
SELECT r.id, m.id,
       CASE WHEN m.codice IN ('boletas','mantenimientos','tareas','macchine') THEN 1 ELSE 0 END,
       CASE WHEN m.codice IN ('boletas','mantenimientos') THEN 1 ELSE 0 END
FROM ruoli r JOIN menu m
WHERE r.codice = 'tecnico'
  AND m.codice IN ('dashboard','boletas','mantenimientos','calendario','tareas','macchine');
