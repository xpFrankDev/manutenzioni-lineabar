-- Añade el código de usuario para el acceso y el proveedor asociado a la máquina.
-- Procede de backend/migrations/002_usuarios_y_proveedor_maquina.sql.
ALTER TABLE utenti ADD COLUMN IF NOT EXISTS codice_usuario VARCHAR(40) NULL UNIQUE AFTER nome;
ALTER TABLE macchine ADD COLUMN IF NOT EXISTS fk_fornitore BIGINT UNSIGNED NULL AFTER fk_cliente;

-- MariaDB no admite ADD CONSTRAINT IF NOT EXISTS: se comprueba antes de crearla.
SET @existe_fk_macchine_fornitore := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'macchine'
    AND CONSTRAINT_NAME = 'fk_macchine_fornitore'
);
SET @sentencia_fk_macchine_fornitore := IF(
  @existe_fk_macchine_fornitore = 0,
  'ALTER TABLE macchine ADD CONSTRAINT fk_macchine_fornitore FOREIGN KEY (fk_fornitore) REFERENCES fornitori(id)',
  'SELECT 1'
);
PREPARE sentencia_fk_macchine_fornitore FROM @sentencia_fk_macchine_fornitore;
EXECUTE sentencia_fk_macchine_fornitore;
DEALLOCATE PREPARE sentencia_fk_macchine_fornitore;

UPDATE utenti SET codice_usuario='dev01' WHERE email='dev@lineabar.it' AND codice_usuario IS NULL;
UPDATE macchine SET fk_fornitore=1 WHERE id=1 AND fk_fornitore IS NULL;
UPDATE macchine SET fk_fornitore=2 WHERE id=2 AND fk_fornitore IS NULL;
UPDATE macchine SET fk_fornitore=3 WHERE id=3 AND fk_fornitore IS NULL;
