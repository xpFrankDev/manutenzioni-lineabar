-- Parámetros de negocio configurables desde la aplicación: tarifa de mano de
-- obra, días de aviso del calendario y horizonte de previsión. Antes estaban
-- fijos en el código del backend y del frontend.
CREATE TABLE IF NOT EXISTS parametros (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  chiave VARCHAR(60) NOT NULL UNIQUE,
  valore VARCHAR(190) NOT NULL,
  descrizione VARCHAR(255) NULL,
  creato_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificato_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  utente_crea BIGINT UNSIGNED NULL,
  utente_modifica BIGINT UNSIGNED NULL,
  stato ENUM('attivo','inattivo') NOT NULL DEFAULT 'attivo'
);

INSERT IGNORE INTO parametros (chiave, valore, descrizione) VALUES
  ('tarifa_mano_de_obra_hora', '65', 'Tarifa por hora de mano de obra (EUR)'),
  ('aviso_manutencion_dias', '7', 'Días de antelación para avisar de una manutención'),
  ('horizonte_calendario_dias', '30', 'Días mostrados como próximos en el calendario'),
  ('prevision_manutencion_meses', '6', 'Meses de previsión en los informes');
