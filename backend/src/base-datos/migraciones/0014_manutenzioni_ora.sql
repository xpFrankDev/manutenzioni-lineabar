-- Ora effettiva della manutenzione, oltre alla data. Le righe storiche usano
-- l'ora di creazione del record come valore iniziale ragionevole.
ALTER TABLE manutenzioni
  ADD COLUMN IF NOT EXISTS ora TIME NULL AFTER data;

UPDATE manutenzioni SET ora = TIME(creato_at) WHERE ora IS NULL;
