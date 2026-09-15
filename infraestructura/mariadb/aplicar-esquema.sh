#!/bin/sh
set -eu

export MYSQL_PWD="${LINEABAR_MIGRATIONS_PASSWORD}"
if ! mariadb -N -h mariadb -u"${LINEABAR_MIGRATIONS_USER}" "${MARIADB_DATABASE}" -e "SHOW TABLES LIKE 'ruoli'" | grep -q '^ruoli$'; then
  mariadb -h mariadb -u"${LINEABAR_MIGRATIONS_USER}" "${MARIADB_DATABASE}" < /migraciones/001_schema_iniziale.sql
fi
mariadb -h mariadb -u"${LINEABAR_MIGRATIONS_USER}" "${MARIADB_DATABASE}" < /migraciones/002_usuarios_y_proveedor_maquina.sql || true
mariadb -h mariadb -u"${LINEABAR_MIGRATIONS_USER}" "${MARIADB_DATABASE}" < /migraciones/003_datos_usuario_y_proveedor.sql
mariadb -h mariadb -u"${LINEABAR_MIGRATIONS_USER}" "${MARIADB_DATABASE}" < /migraciones/004_registri_dimostrativi.sql
mariadb -h mariadb -u"${LINEABAR_MIGRATIONS_USER}" "${MARIADB_DATABASE}" < /migraciones/005_marca_linea_bar.sql
mariadb -h mariadb -u"${LINEABAR_MIGRATIONS_USER}" "${MARIADB_DATABASE}" < /migraciones/006_attivita_multi_tecnici.sql
mariadb -h mariadb -u"${LINEABAR_MIGRATIONS_USER}" "${MARIADB_DATABASE}" <<'SQL'
INSERT IGNORE INTO ruoli (id, codice, nome) VALUES
  (1, 'amministratore', 'Amministratore'),
  (2, 'tecnico', 'Tecnico');
INSERT IGNORE INTO utenti (id, fk_ruolo, nome, email, password_hash) VALUES
  (1, 1, 'Sviluppatore Linea Bar', 'dev@lineabar.it', '$2b$12$jZgMoil91ZOx/5Rd8h8J..4maPKF4TUYkABIFEazcSYmYcNL6ZSPi');
INSERT IGNORE INTO fornitori (id, codice, nome) VALUES
  (1, 'CIMBALI', 'La Cimbali'),
  (2, 'HAUSBRANDT', 'Hausbrandt'),
  (3, 'ILLY', 'illy'),
  (4, 'BWT', 'BWT water+more'),
  (5, 'SCOTSMAN', 'Scotsman'),
  (6, 'WINTERHALTER', 'Winterhalter');
INSERT IGNORE INTO marche (id, nome) VALUES
  (1, 'La Cimbali'), (2, 'Scotsman'), (3, 'Winterhalter'), (4, 'BWT'), (5, 'Brita');
INSERT IGNORE INTO clienti (id, fk_fornitore, tipo_cliente, codice, nome, indirizzo, citta) VALUES
  (1, 1, 'fornitore', 'CIMBALI-0001', 'Caffè Roma', 'Via Torino 22', 'Milano'),
  (2, 2, 'fornitore', 'HAUSBRANDT-0001', 'Bar Centrale', 'Via Italia 9', 'Monza'),
  (3, NULL, 'privato', 'PRIV-0001', 'Osteria del Ponte', 'Via Volta 17', 'Como');
INSERT IGNORE INTO macchine (id, fk_cliente, fk_marca, codice_unico, tipo_macchina, modello) VALUES
  (1, 1, 1, 'MC-CIM-0041', 'macchina_caffe', 'M100'),
  (2, 2, 4, 'MC-BWT-0018', 'addolcitore', 'Bestmax Premium'),
  (3, 3, 3, 'MC-WIN-0009', 'lavastoviglie', 'UC-L');
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
INSERT IGNORE INTO calendario_manutenzioni_macchine (id, fk_macchina, fk_pezzo, frequenza_mesi, ultima_esecuzione, prossima_manutenzione) VALUES
  (1, 1, 1, 5, '2026-05-14', '2026-10-14'),
  (2, 2, 3, 12, '2026-01-10', '2027-01-10'),
  (3, 3, 4, 12, '2026-03-02', '2027-03-02');
INSERT IGNORE INTO attivita (id, fk_cliente, fk_macchina, fk_assegnato, titolo, scadenza, priorita) VALUES
  (1, 2, 2, 1, 'Controllo addolcitore', '2026-09-18', 'alta'),
  (2, 1, 1, 1, 'Cambio guarnizione gruppo', '2026-10-14', 'normale');
SQL
