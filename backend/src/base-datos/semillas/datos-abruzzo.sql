-- Clienti dimostrativi dell'Abruzzo per provare la programmazione per zone.
-- Ogni cliente ha un link Google Maps e coordinate usate per stimare i tempi.
-- I dati sono dimostrativi e si caricano solo con LINEABAR_CARGAR_ABRUZZO=1.

INSERT IGNORE INTO clienti (id, fk_fornitore, tipo_cliente, codice, nome, indirizzo, url_mappe, latitudine, longitudine, citta) VALUES
  ('eeeeeeee-eeee-4eee-8eee-000000000001', '22222222-2222-4222-8222-000000000001', 'fornitore', 'ABR-0001', 'Bar Centrale L’Aquila', 'Corso Vittorio Emanuele 12', 'https://www.google.com/maps/search/?api=1&query=42.3498,13.3995', 42.349800, 13.399500, 'L’Aquila'),
  ('eeeeeeee-eeee-4eee-8eee-000000000002', NULL, 'privato', 'ABR-0002', 'Caffè Letterario', 'Via San Bernardino 5', 'https://www.google.com/maps/search/?api=1&query=42.3530,13.3970', 42.353000, 13.397000, 'L’Aquila'),
  ('eeeeeeee-eeee-4eee-8eee-000000000003', '22222222-2222-4222-8222-000000000002', 'fornitore', 'ABR-0003', 'Pasticceria Duomo', 'Piazza Duomo 8', 'https://www.google.com/maps/search/?api=1&query=42.3501,13.3987', 42.350100, 13.398700, 'L’Aquila'),
  ('eeeeeeee-eeee-4eee-8eee-000000000004', '22222222-2222-4222-8222-000000000001', 'fornitore', 'ABR-0004', 'Bar Il Corso', 'Corso Federico II 44', 'https://www.google.com/maps/search/?api=1&query=42.3488,13.3999', 42.348800, 13.399900, 'L’Aquila'),
  ('eeeeeeee-eeee-4eee-8eee-000000000005', NULL, 'privato', 'ABR-0005', 'Caffè Grande Avezzano', 'Via Corradino 3', 'https://www.google.com/maps/search/?api=1&query=42.0289,13.4264', 42.028900, 13.426400, 'Avezzano'),
  ('eeeeeeee-eeee-4eee-8eee-000000000006', NULL, 'privato', 'ABR-0006', 'Bar della Stazione', 'Piazza della Stazione 2', 'https://www.google.com/maps/search/?api=1&query=42.0320,13.4260', 42.032000, 13.426000, 'Avezzano'),
  ('eeeeeeee-eeee-4eee-8eee-000000000007', '22222222-2222-4222-8222-000000000002', 'fornitore', 'ABR-0007', 'Bar Corso Ovidio', 'Corso Ovidio 21', 'https://www.google.com/maps/search/?api=1&query=42.0494,13.9284', 42.049400, 13.928400, 'Sulmona'),
  ('eeeeeeee-eeee-4eee-8eee-000000000008', NULL, 'privato', 'ABR-0008', 'Caffè Letterario Sulmona', 'Via Erasmo 7', 'https://www.google.com/maps/search/?api=1&query=42.0479,13.9260', 42.047900, 13.926000, 'Sulmona'),
  ('eeeeeeee-eeee-4eee-8eee-000000000009', '22222222-2222-4222-8222-000000000001', 'fornitore', 'ABR-0009', 'Caffè Adriatico', 'Lungomare Matteotti 18', 'https://www.google.com/maps/search/?api=1&query=42.4643,14.2140', 42.464300, 14.214000, 'Pescara'),
  ('eeeeeeee-eeee-4eee-8eee-000000000010', NULL, 'privato', 'ABR-0010', 'Bar Lungomare', 'Via Bardet 9', 'https://www.google.com/maps/search/?api=1&query=42.4700,14.2200', 42.470000, 14.220000, 'Pescara'),
  ('eeeeeeee-eeee-4eee-8eee-000000000011', '22222222-2222-4222-8222-000000000002', 'fornitore', 'ABR-0011', 'Caffè Marrucino', 'Via Cocco 12', 'https://www.google.com/maps/search/?api=1&query=42.3512,14.1670', 42.351200, 14.167000, 'Chieti'),
  ('eeeeeeee-eeee-4eee-8eee-000000000012', NULL, 'privato', 'ABR-0012', 'Bar Duomo Teramo', 'Piazza Martiri 4', 'https://www.google.com/maps/search/?api=1&query=42.6580,13.7040', 42.658000, 13.704000, 'Teramo'),
  ('eeeeeeee-eeee-4eee-8eee-000000000013', NULL, 'privato', 'ABR-0013', 'Bar Parco Pescasseroli', 'Via Pescara 2', 'https://www.google.com/maps/search/?api=1&query=41.8080,13.7900', 41.808000, 13.790000, 'Pescasseroli'),
  ('eeeeeeee-eeee-4eee-8eee-000000000014', '22222222-2222-4222-8222-000000000001', 'fornitore', 'ABR-0014', 'Bar Piazza Palazzo', 'Piazza Palazzo 6', 'https://www.google.com/maps/search/?api=1&query=42.3510,13.3960', 42.351000, 13.396000, 'L’Aquila'),
  ('eeeeeeee-eeee-4eee-8eee-000000000015', NULL, 'privato', 'ABR-0015', 'Caffè San Silvestro', 'Via San Silvestro 15', 'https://www.google.com/maps/search/?api=1&query=42.3540,13.4020', 42.354000, 13.402000, 'L’Aquila');

INSERT IGNORE INTO macchine (id, fk_cliente, fk_marca, fk_fornitore, codice_unico, matricola, tipo_macchina, modello) VALUES
  ('ffffffff-ffff-4fff-8fff-000000000001', 'eeeeeeee-eeee-4eee-8eee-000000000001', '33333333-3333-4333-8333-000000000001', '22222222-2222-4222-8222-000000000001', 'ABR-MC-001', 'MAT-ABR-0001', 'macchina_caffe', 'M200'),
  ('ffffffff-ffff-4fff-8fff-000000000002', 'eeeeeeee-eeee-4eee-8eee-000000000002', '33333333-3333-4333-8333-000000000001', NULL, 'ABR-MC-002', 'MAT-ABR-0002', 'macchina_caffe', 'M40'),
  ('ffffffff-ffff-4fff-8fff-000000000003', 'eeeeeeee-eeee-4eee-8eee-000000000003', '33333333-3333-4333-8333-000000000006', '22222222-2222-4222-8222-000000000002', 'ABR-MC-003', 'MAT-ABR-0003', 'macchina_caffe', 'Hausbrandt Line'),
  ('ffffffff-ffff-4fff-8fff-000000000004', 'eeeeeeee-eeee-4eee-8eee-000000000004', '33333333-3333-4333-8333-000000000001', '22222222-2222-4222-8222-000000000001', 'ABR-MC-004', 'MAT-ABR-0004', 'macchina_caffe', 'M100 Attiva'),
  ('ffffffff-ffff-4fff-8fff-000000000005', 'eeeeeeee-eeee-4eee-8eee-000000000005', '33333333-3333-4333-8333-000000000001', NULL, 'ABR-MC-005', 'MAT-ABR-0005', 'macchina_caffe', 'S30'),
  ('ffffffff-ffff-4fff-8fff-000000000006', 'eeeeeeee-eeee-4eee-8eee-000000000006', '33333333-3333-4333-8333-000000000002', NULL, 'ABR-MC-006', 'MAT-ABR-0006', 'produttore_ghiaccio', 'EC 46'),
  ('ffffffff-ffff-4fff-8fff-000000000007', 'eeeeeeee-eeee-4eee-8eee-000000000007', '33333333-3333-4333-8333-000000000006', '22222222-2222-4222-8222-000000000002', 'ABR-MC-007', 'MAT-ABR-0007', 'macchina_caffe', 'Multicaps Deluxe'),
  ('ffffffff-ffff-4fff-8fff-000000000008', 'eeeeeeee-eeee-4eee-8eee-000000000008', '33333333-3333-4333-8333-000000000001', NULL, 'ABR-MC-008', 'MAT-ABR-0008', 'macchina_caffe', 'S20'),
  ('ffffffff-ffff-4fff-8fff-000000000009', 'eeeeeeee-eeee-4eee-8eee-000000000009', '33333333-3333-4333-8333-000000000001', '22222222-2222-4222-8222-000000000001', 'ABR-MC-009', 'MAT-ABR-0009', 'macchina_caffe', 'M26 TE RE'),
  ('ffffffff-ffff-4fff-8fff-000000000010', 'eeeeeeee-eeee-4eee-8eee-000000000010', '33333333-3333-4333-8333-000000000003', NULL, 'ABR-MC-010', 'MAT-ABR-0010', 'lavastoviglie', 'UC-L'),
  ('ffffffff-ffff-4fff-8fff-000000000011', 'eeeeeeee-eeee-4eee-8eee-000000000011', '33333333-3333-4333-8333-000000000006', '22222222-2222-4222-8222-000000000002', 'ABR-MC-011', 'MAT-ABR-0011', 'macchina_caffe', 'Guzzini Hausbrandt'),
  ('ffffffff-ffff-4fff-8fff-000000000012', 'eeeeeeee-eeee-4eee-8eee-000000000012', '33333333-3333-4333-8333-000000000003', NULL, 'ABR-MC-012', 'MAT-ABR-0012', 'lavastoviglie', 'PT-M'),
  ('ffffffff-ffff-4fff-8fff-000000000013', 'eeeeeeee-eeee-4eee-8eee-000000000013', '33333333-3333-4333-8333-000000000002', NULL, 'ABR-MC-013', 'MAT-ABR-0013', 'produttore_ghiaccio', 'NW 608'),
  ('ffffffff-ffff-4fff-8fff-000000000014', 'eeeeeeee-eeee-4eee-8eee-000000000014', '33333333-3333-4333-8333-000000000001', '22222222-2222-4222-8222-000000000001', 'ABR-MC-014', 'MAT-ABR-0014', 'macchina_caffe', 'S15'),
  ('ffffffff-ffff-4fff-8fff-000000000015', 'eeeeeeee-eeee-4eee-8eee-000000000015', '33333333-3333-4333-8333-000000000004', NULL, 'ABR-MC-015', 'MAT-ABR-0015', 'filtro', 'Bestmax Premium');

INSERT IGNORE INTO calendario_manutenzioni_macchine
  (id, fk_macchina, fk_pezzo, fk_manutenzione_origine, frequenza_mesi, ultima_esecuzione, prossima_manutenzione, stato_calendario)
VALUES
  ('abababab-abab-4bab-8bab-000000000001', 'ffffffff-ffff-4fff-8fff-000000000001', '55555555-5555-4555-8555-000000000001', NULL, 5, '2026-05-20', '2026-10-22', 'programmato'),
  ('abababab-abab-4bab-8bab-000000000002', 'ffffffff-ffff-4fff-8fff-000000000002', '55555555-5555-4555-8555-000000000002', NULL, 24, '2026-02-10', '2026-10-23', 'programmato'),
  ('abababab-abab-4bab-8bab-000000000003', 'ffffffff-ffff-4fff-8fff-000000000003', '55555555-5555-4555-8555-000000000003', NULL, 12, '2025-10-24', '2026-10-24', 'programmato'),
  ('abababab-abab-4bab-8bab-000000000004', 'ffffffff-ffff-4fff-8fff-000000000004', '55555555-5555-4555-8555-000000000004', NULL, 12, '2025-10-26', '2026-10-26', 'programmato'),
  ('abababab-abab-4bab-8bab-000000000005', 'ffffffff-ffff-4fff-8fff-000000000005', '55555555-5555-4555-8555-000000000005', NULL, 24, '2024-10-27', '2026-10-27', 'programmato'),
  ('abababab-abab-4bab-8bab-000000000006', 'ffffffff-ffff-4fff-8fff-000000000006', '55555555-5555-4555-8555-000000000006', NULL, 18, '2025-10-28', '2026-10-28', 'programmato'),
  ('abababab-abab-4bab-8bab-000000000007', 'ffffffff-ffff-4fff-8fff-000000000007', '55555555-5555-4555-8555-000000000007', NULL, 24, '2024-10-29', '2026-10-29', 'programmato'),
  ('abababab-abab-4bab-8bab-000000000008', 'ffffffff-ffff-4fff-8fff-000000000008', '55555555-5555-4555-8555-000000000008', NULL, 12, '2025-10-30', '2026-10-30', 'programmato'),
  ('abababab-abab-4bab-8bab-000000000009', 'ffffffff-ffff-4fff-8fff-000000000009', '55555555-5555-4555-8555-000000000009', NULL, 12, '2025-11-02', '2026-11-02', 'programmato'),
  ('abababab-abab-4bab-8bab-000000000010', 'ffffffff-ffff-4fff-8fff-000000000010', '55555555-5555-4555-8555-000000000010', NULL, 24, '2024-11-03', '2026-11-03', 'programmato'),
  ('abababab-abab-4bab-8bab-000000000011', 'ffffffff-ffff-4fff-8fff-000000000011', '55555555-5555-4555-8555-000000000011', NULL, 18, '2025-11-04', '2026-11-04', 'programmato'),
  ('abababab-abab-4bab-8bab-000000000012', 'ffffffff-ffff-4fff-8fff-000000000012', '55555555-5555-4555-8555-000000000012', NULL, 24, '2024-11-05', '2026-11-05', 'programmato'),
  ('abababab-abab-4bab-8bab-000000000013', 'ffffffff-ffff-4fff-8fff-000000000013', '55555555-5555-4555-8555-000000000013', NULL, 24, '2024-11-06', '2026-11-06', 'programmato'),
  ('abababab-abab-4bab-8bab-000000000014', 'ffffffff-ffff-4fff-8fff-000000000014', '55555555-5555-4555-8555-000000000014', NULL, 12, '2025-11-09', '2026-11-09', 'programmato'),
  ('abababab-abab-4bab-8bab-000000000015', 'ffffffff-ffff-4fff-8fff-000000000015', '55555555-5555-4555-8555-000000000014', NULL, 12, '2025-11-10', '2026-11-10', 'programmato');
