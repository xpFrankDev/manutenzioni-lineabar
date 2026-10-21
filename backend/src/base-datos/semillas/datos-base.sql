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
  ('33333333-3333-4333-8333-000000000005', 'Brita'),
  ('33333333-3333-4333-8333-000000000006', 'Hausbrandt');

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


-- Catalogo dei modelli commerciali. Le immagini puntano alla scheda ufficiale
-- del produttore; il catalogo è informativo e non crea macchine installate.
INSERT IGNORE INTO modelli_macchina (id, fk_marca, nome, tipo_macchina, immagine_url, scheda_url) VALUES
  ('dddddddd-dddd-4ddd-8ddd-000000000001', '33333333-3333-4333-8333-000000000001', 'M200', 'macchina_caffe', 'https://www.cimbali.it/sites/default/files/styles/image_for_link/public/m200_gt1_matt_black_frontale_trasp_1-250.png', 'https://www.cimbali.it/prodotti/macchine-tradizionali/m200'),
  ('dddddddd-dddd-4ddd-8ddd-000000000002', '33333333-3333-4333-8333-000000000001', 'M40', 'macchina_caffe', 'https://www.cimbali.it/sites/default/files/styles/image_for_link/public/1_5.png', 'https://www.cimbali.it/prodotti/macchine-tradizionali/m40'),
  ('dddddddd-dddd-4ddd-8ddd-000000000003', '33333333-3333-4333-8333-000000000001', 'M100 Attiva', 'macchina_caffe', 'https://www.cimbali.it/sites/default/files/styles/image_for_link/public/m100-attiva-link.png', 'https://www.cimbali.it/prodotti/macchine-tradizionali/m100-attiva'),
  ('dddddddd-dddd-4ddd-8ddd-000000000004', '33333333-3333-4333-8333-000000000001', 'M26 TE RE', 'macchina_caffe', 'https://www.cimbali.it/sites/default/files/styles/image_for_link/public/img-x-link-m26-te_0.png', 'https://www.cimbali.it/prodotti/macchine-tradizionali/m26-te-re'),
  ('dddddddd-dddd-4ddd-8ddd-000000000005', '33333333-3333-4333-8333-000000000001', 'M26', 'macchina_caffe', 'https://www.cimbali.it/sites/default/files/styles/image_for_link/public/img-x-link-m26-se-be_0.png', 'https://www.cimbali.it/prodotti/macchine-tradizionali/m26'),
  ('dddddddd-dddd-4ddd-8ddd-000000000006', '33333333-3333-4333-8333-000000000001', 'S60', 'macchina_caffe', 'https://www.cimbali.it/sites/default/files/styles/image_for_link/public/nome_prodotto.png', 'https://www.cimbali.it/prodotti/macchine-superautomatiche/s60'),
  ('dddddddd-dddd-4ddd-8ddd-000000000007', '33333333-3333-4333-8333-000000000001', 'Supera', 'macchina_caffe', 'https://www.cimbali.it/sites/default/files/styles/image_for_link/public/senza_titolo-1.png', 'https://www.cimbali.it/prodotti/macchine-superautomatiche/supera'),
  ('dddddddd-dddd-4ddd-8ddd-000000000008', '33333333-3333-4333-8333-000000000001', 'S30', 'macchina_caffe', 'https://www.cimbali.it/sites/default/files/styles/image_for_link/public/s30-lato-centrale.png', 'https://www.cimbali.it/prodotti/macchine-superautomatiche/s30'),
  ('dddddddd-dddd-4ddd-8ddd-000000000009', '33333333-3333-4333-8333-000000000001', 'S20', 'macchina_caffe', 'https://www.cimbali.it/sites/default/files/styles/image_for_link/public/miniatura_s20.png', 'https://www.cimbali.it/prodotti/macchine-superautomatiche/s20'),
  ('dddddddd-dddd-4ddd-8ddd-000000000010', '33333333-3333-4333-8333-000000000001', 'S20 Fresh Brew', 'macchina_caffe', 'https://www.cimbali.it/sites/default/files/styles/image_for_link/public/link250.png', 'https://www.cimbali.it/prodotti/macchine-superautomatiche/s20-fresh-brew'),
  ('dddddddd-dddd-4ddd-8ddd-000000000011', '33333333-3333-4333-8333-000000000001', 'S15', 'macchina_caffe', 'https://www.cimbali.it/sites/default/files/styles/image_for_link/public/s15_frontale_nera_luce_rossa_cs11_trasp.png', 'https://www.cimbali.it/prodotti/macchine-superautomatiche/s15'),
  ('dddddddd-dddd-4ddd-8ddd-000000000012', '33333333-3333-4333-8333-000000000001', 'S-Lite', 'macchina_caffe', 'https://www.cimbali.it/sites/default/files/styles/image_for_link/public/s-lite-immagine-per-link_0.png', 'https://www.cimbali.it/prodotti/macchine-superautomatiche/slite'),
  ('dddddddd-dddd-4ddd-8ddd-000000000013', '33333333-3333-4333-8333-000000000006', 'Guzzini Hausbrandt', 'macchina_caffe', 'https://www.hausbrandt.it/wp-content/uploads/macchina-guzzini-hausbrandt.png', 'https://www.hausbrandt.it/prodotto/macchina-guzzini-hausbrandt/'),
  ('dddddddd-dddd-4ddd-8ddd-000000000014', '33333333-3333-4333-8333-000000000006', 'Hausbrandt Line', 'macchina_caffe', 'https://www.hausbrandt.it/wp-content/uploads/macchina-hausbrandt-line.png', 'https://www.hausbrandt.it/prodotto/macchina-hausbrandt-line/'),
  ('dddddddd-dddd-4ddd-8ddd-000000000015', '33333333-3333-4333-8333-000000000006', 'Multicaps Deluxe', 'macchina_caffe', 'https://www.hausbrandt.it/wp-content/uploads/deluxe.png', 'https://www.hausbrandt.it/prodotto/hausbrandt-multicaps-deluxe/'),
  ('dddddddd-dddd-4ddd-8ddd-000000000016', '33333333-3333-4333-8333-000000000003', 'UC-L', 'lavastoviglie', 'https://www.winterhalter.com/fileadmin/_processed_/9/5/csm_undercounter-warewasher-winterhalter-uc-desktop-_9fc293a9c6.png', 'https://www.winterhalter.com/products/undercounter-warewashers/uc-series/'),
  ('dddddddd-dddd-4ddd-8ddd-000000000017', '33333333-3333-4333-8333-000000000003', 'UC-M', 'lavastoviglie', 'https://www.winterhalter.com/fileadmin/_processed_/9/5/csm_undercounter-warewasher-winterhalter-uc-desktop-_9fc293a9c6.png', 'https://www.winterhalter.com/products/undercounter-warewashers/uc-series/'),
  ('dddddddd-dddd-4ddd-8ddd-000000000018', '33333333-3333-4333-8333-000000000003', 'UC-XL', 'lavastoviglie', 'https://www.winterhalter.com/fileadmin/_processed_/9/5/csm_undercounter-warewasher-winterhalter-uc-desktop-_9fc293a9c6.png', 'https://www.winterhalter.com/products/undercounter-warewashers/uc-series/'),
  ('dddddddd-dddd-4ddd-8ddd-000000000019', '33333333-3333-4333-8333-000000000003', 'PT-L', 'lavastoviglie', 'https://www.winterhalter.com/fileadmin/_processed_/e/2/csm_winterhalter-passthrough-dishwasher-pt-series-_96b6c19788.png', 'https://www.winterhalter.com/products/passthrough-dishwasher/pt-series/'),
  ('dddddddd-dddd-4ddd-8ddd-000000000020', '33333333-3333-4333-8333-000000000003', 'PT-M', 'lavastoviglie', 'https://www.winterhalter.com/fileadmin/_processed_/e/2/csm_winterhalter-passthrough-dishwasher-pt-series-_96b6c19788.png', 'https://www.winterhalter.com/products/passthrough-dishwasher/pt-series/'),
  ('dddddddd-dddd-4ddd-8ddd-000000000021', '33333333-3333-4333-8333-000000000003', 'PT-XL', 'lavastoviglie', 'https://www.winterhalter.com/fileadmin/_processed_/e/2/csm_winterhalter-passthrough-dishwasher-pt-series-_96b6c19788.png', 'https://www.winterhalter.com/products/passthrough-dishwasher/pt-series/'),
  ('dddddddd-dddd-4ddd-8ddd-000000000022', '33333333-3333-4333-8333-000000000002', 'EC 46', 'produttore_ghiaccio', 'https://scotsmansa.co.za/wp-content/uploads/2018/05/EC46.jpg', 'https://www.scotsman-ice.it/library/spec-sheets/gourmet/ec-46/ec-46-en.pdf'),
  ('dddddddd-dddd-4ddd-8ddd-000000000023', '33333333-3333-4333-8333-000000000002', 'EC 56', 'produttore_ghiaccio', 'https://scotsmansa.co.za/wp-content/uploads/2018/05/EC56.jpg', 'https://www.scotsman-ice.it/library/spec-sheets/'),
  ('dddddddd-dddd-4ddd-8ddd-000000000024', '33333333-3333-4333-8333-000000000002', 'EC 86', 'produttore_ghiaccio', 'https://scotsmansa.co.za/wp-content/uploads/2018/05/EC86.jpg', 'https://www.scotsman-ice.it/library/spec-sheets/'),
  ('dddddddd-dddd-4ddd-8ddd-000000000025', '33333333-3333-4333-8333-000000000002', 'NW 608', 'produttore_ghiaccio', 'https://scotsmansa.co.za/wp-content/uploads/2018/05/NW608-Head.jpg', 'https://www.scotsman-ice.it/library/spec-sheets/'),
  ('dddddddd-dddd-4ddd-8ddd-000000000026', '33333333-3333-4333-8333-000000000002', 'NW 1008', 'produttore_ghiaccio', 'https://scotsmansa.co.za/wp-content/uploads/2018/05/NW1008-Head.jpg', 'https://www.scotsman-ice.it/library/spec-sheets/'),
  ('dddddddd-dddd-4ddd-8ddd-000000000027', '33333333-3333-4333-8333-000000000002', 'AF 80', 'produttore_ghiaccio', 'https://scotsmansa.co.za/wp-content/uploads/2018/05/AF80.jpg', 'https://www.scotsman-ice.it/library/spec-sheets/');
