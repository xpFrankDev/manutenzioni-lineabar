-- La columna fk_manutenzione_chiusura se añadió sin clave foránea declarada y
-- la migración genérica de UUID no la detectó. Se convierte y se declara la FK.
ALTER TABLE attivita
  ADD COLUMN IF NOT EXISTS fk_manutenzione_chiusura_uuid CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL
  AFTER fk_manutenzione_chiusura;

UPDATE attivita a
JOIN manutenzioni m ON m.id = a.fk_manutenzione_chiusura
SET a.fk_manutenzione_chiusura_uuid = m.id
WHERE a.fk_manutenzione_chiusura IS NOT NULL;

ALTER TABLE attivita DROP COLUMN fk_manutenzione_chiusura;
ALTER TABLE attivita
  CHANGE fk_manutenzione_chiusura_uuid fk_manutenzione_chiusura CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL;

SET @existe_fk_attivita_manutenzione := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'attivita'
    AND CONSTRAINT_NAME = 'fk_attivita_manutenzione_chiusura'
);
SET @sentencia_fk_attivita_manutenzione := IF(
  @existe_fk_attivita_manutenzione = 0,
  'ALTER TABLE attivita ADD CONSTRAINT fk_attivita_manutenzione_chiusura FOREIGN KEY (fk_manutenzione_chiusura) REFERENCES manutenzioni(id)',
  'SELECT 1'
);
PREPARE sentencia_fk_attivita_manutenzione FROM @sentencia_fk_attivita_manutenzione;
EXECUTE sentencia_fk_attivita_manutenzione;
DEALLOCATE PREPARE sentencia_fk_attivita_manutenzione;
