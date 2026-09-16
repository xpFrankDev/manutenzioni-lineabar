-- Datos maestros indispensables para operar: roles, proveedores, marcas,
-- características y recambios reales. Todas las sentencias son idempotentes.
-- El usuario administrador inicial se crea en sembrar.js porque su contraseña
-- se cifra en tiempo de ejecución y nunca se versiona.

INSERT IGNORE INTO ruoli (id, codice, nome) VALUES
  (1, 'amministratore', 'Amministratore'),
  (2, 'tecnico', 'Tecnico');

INSERT IGNORE INTO fornitori (id, codice, nome) VALUES
  (1, 'CIMBALI', 'La Cimbali'),
  (2, 'HAUSBRANDT', 'Hausbrandt'),
  (3, 'ILLY', 'illy'),
  (4, 'BWT', 'BWT water+more'),
  (5, 'SCOTSMAN', 'Scotsman'),
  (6, 'WINTERHALTER', 'Winterhalter');

INSERT IGNORE INTO marche (id, nome) VALUES
  (1, 'La Cimbali'), (2, 'Scotsman'), (3, 'Winterhalter'), (4, 'BWT'), (5, 'Brita');

INSERT IGNORE INTO tipi_caratteristiche (id, codice_unico, nome, unita_misura) VALUES
  (1, 'TENSIONE', 'Tensione nominale', 'V'), (2, 'POTENZA', 'Potenza', 'W'),
  (3, 'DIAMETRO', 'Diametro', 'mm'), (4, 'ANGOLO', 'Angolo raccordo', 'gradi'),
  (5, 'PORTATA', 'Portata acqua', 'l/h'), (6, 'DUREZZA', 'Capacità addolcimento', '°f');

INSERT IGNORE INTO pezzi (id, fk_marca, nome, codice_unico, tipo_macchina, prezzo, intervallo_mesi) VALUES
  (1, 1, 'Guarnizione gruppo', 'PZ-CIM-GUAR-001', 'macchina_caffe', 18.00, 5),
  (2, 1, 'Elettrovalvola 2 vie 230V', 'PZ-CIM-ELV-002', 'macchina_caffe', 46.00, 24),
  (3, 4, 'Cartuccia filtro Bestmax', 'PZ-BWT-FLT-001', 'filtro', 24.00, 12),
  (4, 3, 'Guarnizione porta', 'PZ-WIN-GUAR-001', 'lavastoviglie', 22.00, 12),
  (5, NULL, 'Tubo raccordo 90°', 'PZ-TUB-90-001', 'lavastoviglie', 14.00, NULL),
  (6, 2, 'Sensore livello ghiaccio', 'PZ-SCO-SEN-001', 'produttore_ghiaccio', 31.00, 18),
  (7, 2, 'Pompa scarico', 'PZ-SCO-PMP-001', 'produttore_ghiaccio', 78.00, 24),
  (8, 4, 'Testata addolcitore', 'PZ-BWT-ADD-001', 'addolcitore', 95.00, 12);

INSERT IGNORE INTO pezzi (fk_marca, nome, codice_unico, tipo_macchina, prezzo, intervallo_mesi) VALUES
  (4, 'Cartuccia BWT bestmax SOFT S', 'FS22I10A00', 'filtro', 68.00, 12),
  (4, 'Testata BWT besthead FLEX 3/8', 'FS00Z20A00', 'filtro', 112.00, 24),
  (2, 'Sensore livello acqua Scotsman', 'A39126-021', 'produttore_ghiaccio', 66.00, 18),
  (2, 'Elettrovalvola harvest Scotsman 230V', '12-3060-22', 'produttore_ghiaccio', 88.00, 24),
  (2, 'Pompa acqua Scotsman 230V', '12-2919-22', 'produttore_ghiaccio', 145.00, 24),
  (3, 'Filtro vasca UC Series', 'PZ-WIN-FLT-UC-001', 'lavastoviglie', 39.00, 12);

INSERT IGNORE INTO pezzi_tipi_caratteristiche (fk_pezzo, fk_tipo_caratteristica, quantita) VALUES
  (2, 1, 230), (2, 2, 12), (5, 4, 90), (5, 3, 12), (3, 5, 120), (8, 6, 120);
