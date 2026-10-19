-- Matricola/serial della macchina. Le macchine esistenti ricevono un valore
-- numerico casuale di 9 cifre; le nuove lo richiedono nel formulario.
ALTER TABLE macchine
  ADD COLUMN IF NOT EXISTS matricola VARCHAR(60) NULL AFTER codice_unico;

UPDATE macchine
SET matricola = CONCAT('MAT-', LPAD(FLOOR(RAND() * 1000000000), 9, '0'))
WHERE matricola IS NULL;

ALTER TABLE macchine
  MODIFY matricola VARCHAR(60) NOT NULL;

CREATE INDEX IF NOT EXISTS idx_macchine_matricola ON macchine (matricola);
