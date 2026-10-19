-- Datos maestros indispensables para operar: roles, proveedores, marcas,
-- características y recambios reales. Todas las sentencias son idempotentes.
-- Los identificadores son UUID fijos para que las semillas sean reproducibles.
-- El usuario administrador inicial se crea en sembrar.js porque su contraseña
-- se cifra en tiempo de ejecución y nunca se versiona.

INSERT IGNORE INTO ruoli (id, codice, nome) VALUES
  ('11111111-1111-4111-8111-000000000001', 'amministratore', 'Amministratore'),
  ('11111111-1111-4111-8111-000000000002', 'tecnico', 'Tecnico');

INSERT IGNORE INTO fornitori (id, codice, nome) VALUES
  ('22222222-2222-4222-8222-000000000001', 'CIMBALI', 'La Cimbali'),
  ('22222222-2222-4222-8222-000000000002', 'HAUSBRANDT', 'Hausbrandt'),
  ('22222222-2222-4222-8222-000000000003', 'ILLY', 'illy'),
  ('22222222-2222-4222-8222-000000000004', 'BWT', 'BWT water+more'),
  ('22222222-2222-4222-8222-000000000005', 'SCOTSMAN', 'Scotsman'),
  ('22222222-2222-4222-8222-000000000006', 'WINTERHALTER', 'Winterhalter');

INSERT IGNORE INTO marche (id, nome) VALUES
  ('33333333-3333-4333-8333-000000000001', 'La Cimbali'),
  ('33333333-3333-4333-8333-000000000002', 'Scotsman'),
  ('33333333-3333-4333-8333-000000000003', 'Winterhalter'),
  ('33333333-3333-4333-8333-000000000004', 'BWT'),
  ('33333333-3333-4333-8333-000000000005', 'Brita');

INSERT IGNORE INTO tipi_caratteristiche (id, codice_unico, nome, unita_misura) VALUES
  ('44444444-4444-4444-8444-000000000001', 'TENSIONE', 'Tensione nominale', 'V'),
  ('44444444-4444-4444-8444-000000000002', 'POTENZA', 'Potenza', 'W'),
  ('44444444-4444-4444-8444-000000000003', 'DIAMETRO', 'Diametro', 'mm'),
  ('44444444-4444-4444-8444-000000000004', 'ANGOLO', 'Angolo raccordo', 'gradi'),
  ('44444444-4444-4444-8444-000000000005', 'PORTATA', 'Portata acqua', 'l/h'),
  ('44444444-4444-4444-8444-000000000006', 'DUREZZA', 'Capacità addolcimento', '°f');

INSERT IGNORE INTO pezzi (id, fk_marca, nome, codice_unico, tipo_macchina, prezzo, intervallo_mesi) VALUES
  ('55555555-5555-4555-8555-000000000001', '33333333-3333-4333-8333-000000000001', 'Guarnizione gruppo', 'PZ-CIM-GUAR-001', 'macchina_caffe', 18.00, 5),
  ('55555555-5555-4555-8555-000000000002', '33333333-3333-4333-8333-000000000001', 'Elettrovalvola 2 vie 230V', 'PZ-CIM-ELV-002', 'macchina_caffe', 46.00, 24),
  ('55555555-5555-4555-8555-000000000003', '33333333-3333-4333-8333-000000000004', 'Cartuccia filtro Bestmax', 'PZ-BWT-FLT-001', 'filtro', 24.00, 12),
  ('55555555-5555-4555-8555-000000000004', '33333333-3333-4333-8333-000000000003', 'Guarnizione porta', 'PZ-WIN-GUAR-001', 'lavastoviglie', 22.00, 12),
  ('55555555-5555-4555-8555-000000000005', NULL, 'Tubo raccordo 90°', 'PZ-TUB-90-001', 'lavastoviglie', 14.00, NULL),
  ('55555555-5555-4555-8555-000000000006', '33333333-3333-4333-8333-000000000002', 'Sensore livello ghiaccio', 'PZ-SCO-SEN-001', 'produttore_ghiaccio', 31.00, 18),
  ('55555555-5555-4555-8555-000000000007', '33333333-3333-4333-8333-000000000002', 'Pompa scarico', 'PZ-SCO-PMP-001', 'produttore_ghiaccio', 78.00, 24),
  ('55555555-5555-4555-8555-000000000008', '33333333-3333-4333-8333-000000000004', 'Testata addolcitore', 'PZ-BWT-ADD-001', 'addolcitore', 95.00, 12);

INSERT IGNORE INTO pezzi (id, fk_marca, nome, codice_unico, tipo_macchina, prezzo, intervallo_mesi) VALUES
  ('55555555-5555-4555-8555-000000000009', '33333333-3333-4333-8333-000000000004', 'Cartuccia BWT bestmax SOFT S', 'FS22I10A00', 'filtro', 68.00, 12),
  ('55555555-5555-4555-8555-000000000010', '33333333-3333-4333-8333-000000000004', 'Testata BWT besthead FLEX 3/8', 'FS00Z20A00', 'filtro', 112.00, 24),
  ('55555555-5555-4555-8555-000000000011', '33333333-3333-4333-8333-000000000002', 'Sensore livello acqua Scotsman', 'A39126-021', 'produttore_ghiaccio', 66.00, 18),
  ('55555555-5555-4555-8555-000000000012', '33333333-3333-4333-8333-000000000002', 'Elettrovalvola harvest Scotsman 230V', '12-3060-22', 'produttore_ghiaccio', 88.00, 24),
  ('55555555-5555-4555-8555-000000000013', '33333333-3333-4333-8333-000000000002', 'Pompa acqua Scotsman 230V', '12-2919-22', 'produttore_ghiaccio', 145.00, 24),
  ('55555555-5555-4555-8555-000000000014', '33333333-3333-4333-8333-000000000003', 'Filtro vasca UC Series', 'PZ-WIN-FLT-UC-001', 'lavastoviglie', 39.00, 12);

INSERT IGNORE INTO pezzi_tipi_caratteristiche (fk_pezzo, fk_tipo_caratteristica, quantita) VALUES
  ('55555555-5555-4555-8555-000000000002', '44444444-4444-4444-8444-000000000001', 230),
  ('55555555-5555-4555-8555-000000000002', '44444444-4444-4444-8444-000000000002', 12),
  ('55555555-5555-4555-8555-000000000005', '44444444-4444-4444-8444-000000000004', 90),
  ('55555555-5555-4555-8555-000000000005', '44444444-4444-4444-8444-000000000003', 12),
  ('55555555-5555-4555-8555-000000000003', '44444444-4444-4444-8444-000000000005', 120),
  ('55555555-5555-4555-8555-000000000008', '44444444-4444-4444-8444-000000000006', 120);
