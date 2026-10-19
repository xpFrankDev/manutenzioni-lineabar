-- I valori di configurazione erano in spagnolo. Si normalizzano chiavi e
-- descrizioni in italiano, mantenendo i valori numerici.
SET @existe_tariffa := (SELECT COUNT(*) FROM parametros WHERE chiave = 'tariffa_manodopera_ora');
UPDATE parametros SET chiave = 'tariffa_manodopera_ora'
WHERE chiave = 'tarifa_mano_de_obra_hora' AND @existe_tariffa = 0;

SET @existe_avviso := (SELECT COUNT(*) FROM parametros WHERE chiave = 'giorni_avviso_manutenzione');
UPDATE parametros SET chiave = 'giorni_avviso_manutenzione'
WHERE chiave = 'aviso_manutencion_dias' AND @existe_avviso = 0;

SET @existe_orizzonte := (SELECT COUNT(*) FROM parametros WHERE chiave = 'orizzonte_calendario_giorni');
UPDATE parametros SET chiave = 'orizzonte_calendario_giorni'
WHERE chiave = 'horizonte_calendario_dias' AND @existe_orizzonte = 0;

SET @existe_previsione := (SELECT COUNT(*) FROM parametros WHERE chiave = 'previsione_manutenzione_mesi');
UPDATE parametros SET chiave = 'previsione_manutenzione_mesi'
WHERE chiave = 'prevision_manutencion_meses' AND @existe_previsione = 0;

UPDATE parametros SET descrizione = 'Tariffa oraria della manodopera (EUR)' WHERE chiave = 'tariffa_manodopera_ora';
UPDATE parametros SET descrizione = 'Giorni di preavviso per una manutenzione' WHERE chiave = 'giorni_avviso_manutenzione';
UPDATE parametros SET descrizione = 'Giorni mostrati come prossimi nel calendario' WHERE chiave = 'orizzonte_calendario_giorni';
UPDATE parametros SET descrizione = 'Mesi di previsione nei report' WHERE chiave = 'previsione_manutenzione_mesi';
