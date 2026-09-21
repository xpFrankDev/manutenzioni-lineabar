-- Persiste le ore di lavoro e il numero di persone di ogni manutenzione.
-- Prima erano usate solo per il calcolo della boleta e andavano perse, quindi
-- non era possibile ricostruire manodopera, report e storico tecnico.
ALTER TABLE manutenzioni
  ADD COLUMN IF NOT EXISTS ore DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER esito,
  ADD COLUMN IF NOT EXISTS persone SMALLINT UNSIGNED NOT NULL DEFAULT 1 AFTER ore;
