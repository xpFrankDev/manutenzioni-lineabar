UPDATE utenti SET codice_usuario='dev01' WHERE email='dev@lineabar.it' AND (codice_usuario IS NULL OR codice_usuario='');
UPDATE macchine SET fk_fornitore=1 WHERE id=1 AND fk_fornitore IS NULL;
UPDATE macchine SET fk_fornitore=2 WHERE id=2 AND fk_fornitore IS NULL;
UPDATE macchine SET fk_fornitore=3 WHERE id=3 AND fk_fornitore IS NULL;
