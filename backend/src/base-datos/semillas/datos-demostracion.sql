-- Datos de demostración: clientes, máquinas y registros ilustrativos de
-- septiembre de 2026. Solo se cargan cuando LINEABAR_CARGAR_DEMO=1, de modo que
-- una instalación de producción no recibe registros ficticios.
-- Procede de la antigua semilla de infraestructura y de
-- backend/migrations/004_registri_dimostrativi.sql.

INSERT IGNORE INTO clienti (id, fk_fornitore, tipo_cliente, codice, nome, indirizzo, citta) VALUES
  (1, 1, 'fornitore', 'CIMBALI-0001', 'Caffè Roma', 'Via Torino 22', 'Milano'),
  (2, 2, 'fornitore', 'HAUSBRANDT-0001', 'Bar Centrale', 'Via Italia 9', 'Monza'),
  (3, NULL, 'privato', 'PRIV-0001', 'Osteria del Ponte', 'Via Volta 17', 'Como');

INSERT IGNORE INTO macchine (id, fk_cliente, fk_marca, codice_unico, tipo_macchina, modello) VALUES
  (1, 1, 1, 'MC-CIM-0041', 'macchina_caffe', 'M100'),
  (2, 2, 4, 'MC-BWT-0018', 'addolcitore', 'Bestmax Premium'),
  (3, 3, 3, 'MC-WIN-0009', 'lavastoviglie', 'UC-L');

INSERT IGNORE INTO calendario_manutenzioni_macchine (id, fk_macchina, fk_pezzo, frequenza_mesi, ultima_esecuzione, prossima_manutenzione) VALUES
  (1, 1, 1, 5, '2026-05-14', '2026-10-14'),
  (2, 2, 3, 12, '2026-01-10', '2027-01-10'),
  (3, 3, 4, 12, '2026-03-02', '2027-03-02');

INSERT IGNORE INTO attivita (id, fk_cliente, fk_macchina, fk_assegnato, titolo, scadenza, priorita) VALUES
  (1, 2, 2, 1, 'Controllo addolcitore', '2026-09-18', 'alta'),
  (2, 1, 1, 1, 'Cambio guarnizione gruppo', '2026-10-14', 'normale');

INSERT IGNORE INTO attivita_tecnici (fk_attivita, fk_tecnico, utente_crea, utente_modifica) VALUES
  (1, 1, 1, 1), (2, 1, 1, 1);

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
