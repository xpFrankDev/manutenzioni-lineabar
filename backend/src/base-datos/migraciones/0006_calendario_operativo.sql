-- Rende operativo il calendario manutenzioni: una riga per macchina e
-- ricambio con intervallo, collegata all'attività generata quando serve.
CREATE UNIQUE INDEX IF NOT EXISTS uq_calendario_macchina_pezzo
  ON calendario_manutenzioni_macchine (fk_macchina, fk_pezzo);

CREATE INDEX IF NOT EXISTS idx_calendario_prossima
  ON calendario_manutenzioni_macchine (stato, stato_calendario, prossima_manutenzione);

ALTER TABLE calendario_manutenzioni_macchine
  ADD COLUMN IF NOT EXISTS fk_attivita BIGINT UNSIGNED NULL AFTER fk_manutenzione_origine,
  ADD COLUMN IF NOT EXISTS note VARCHAR(255) NULL AFTER stato_calendario;

SET @existe_fk_calendario_attivita := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'calendario_manutenzioni_macchine'
    AND CONSTRAINT_NAME = 'fk_calendario_attivita'
);
SET @sentencia_fk_calendario_attivita := IF(
  @existe_fk_calendario_attivita = 0,
  'ALTER TABLE calendario_manutenzioni_macchine ADD CONSTRAINT fk_calendario_attivita FOREIGN KEY (fk_attivita) REFERENCES attivita(id)',
  'SELECT 1'
);
PREPARE sentencia_fk_calendario_attivita FROM @sentencia_fk_calendario_attivita;
EXECUTE sentencia_fk_calendario_attivita;
DEALLOCATE PREPARE sentencia_fk_calendario_attivita;

-- Sincronizza il calendario dimostrativo con le manutenzioni già registrate.
UPDATE calendario_manutenzioni_macchine c
SET c.fk_manutenzione_origine = (
  SELECT MAX(mm.fk_manutenzione)
  FROM macchine_manutenzioni mm
  JOIN manutenzioni m ON m.id = mm.fk_manutenzione
  WHERE mm.fk_macchina = c.fk_macchina AND mm.stato = 'attivo' AND m.stato = 'attivo'
)
WHERE c.fk_manutenzione_origine IS NULL;
