-- Registros persistentes de septiembre 2026: tres boletas y seis intervenciones.
INSERT IGNORE INTO manutenzioni (id,fk_cliente,fk_tecnico,data,ubicazione,note,esito,utente_crea,utente_modifica) VALUES
  (101,1,1,'2026-09-03','cliente','Sostituita la guarnizione del gruppo e controllata l’erogazione.','risolto',1,1),
  (102,2,1,'2026-09-08','cliente','Sostituita cartuccia filtro e verificata la durezza dell’acqua.','risolto',1,1),
  (103,3,1,'2026-09-12','cliente','Sostituita guarnizione porta e testato ciclo di lavaggio.','risolto',1,1),
  (104,1,1,'2026-09-15','magazzino','Controllo preventivo in magazzino: gruppo erogatore e raccordi.','parziale',1,1),
  (105,2,1,'2026-09-17','magazzino','Preparazione addolcitore e test cartuccia di ricambio.','risolto',1,1),
  (106,3,1,'2026-09-20','magazzino','Diagnosi pompa e sensore per lavastoviglie UC-L.','da_rifare',1,1);
INSERT IGNORE INTO macchine_manutenzioni (fk_macchina,fk_manutenzione,utente_crea,utente_modifica) VALUES
  (1,101,1,1),(2,102,1,1),(3,103,1,1),(1,104,1,1),(2,105,1,1),(3,106,1,1);
INSERT IGNORE INTO pezzi_manutenzioni (fk_manutenzione,fk_pezzo,quantita,prezzo_unitario,utente_crea,utente_modifica) VALUES
  (101,1,1,18.00,1,1),(102,3,1,24.00,1,1),(103,4,1,22.00,1,1),
  (104,2,1,46.00,1,1),(105,8,1,95.00,1,1),(106,5,1,14.00,1,1);
INSERT IGNORE INTO boletas (id,fk_cliente,fk_tecnico,codice_boleta,data,prezzo_totale,utente_crea,utente_modifica,stato) VALUES
  (101,1,1,'BL-202609-0001','2026-09-03',148.00,1,1,'emessa'),
  (102,2,1,'BL-202609-0002','2026-09-08',89.00,1,1,'emessa'),
  (103,3,1,'BL-202609-0003','2026-09-12',87.00,1,1,'emessa');
INSERT IGNORE INTO boletas_manutenzioni (fk_boleta,fk_manutenzione,utente_crea,utente_modifica) VALUES
  (101,101,1,1),(102,102,1,1),(103,103,1,1);
INSERT IGNORE INTO boletas_macchine (fk_boleta,fk_macchina,utente_crea,utente_modifica) VALUES
  (101,1,1,1),(102,2,1,1),(103,3,1,1);
INSERT IGNORE INTO boletas_operatori (fk_boleta,fk_operatore,utente_crea,utente_modifica) VALUES
  (101,1,1,1),(102,1,1,1),(103,1,1,1);
