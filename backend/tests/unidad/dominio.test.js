import assert from 'node:assert/strict';
import test from 'node:test';
import { calcularTotales, formatearCodigoBoleta } from '../../src/modulos/boletas/servicio.js';
import {
  DIAS_PROXIMOS,
  estadoVencimiento,
  fechaMasDias,
  hoyIso,
  sumarMeses
} from '../../src/modulos/calendario/servicio.js';
import { agruparRecambios } from '../../src/modulos/interventos/servicio.js';
import { boletasACsv } from '../../src/modulos/reportes/servicio.js';
import {
  extraerNombreCliente,
  limpiarNombre,
  mejorCoincidencia,
  normalizarNombre,
  similitud
} from '../../src/modulos/scontrini/ocr.js';

test('sumarMeses respeta el último día del mes', () => {
  assert.equal(sumarMeses('2026-01-31', 1), '2026-02-28');
  assert.equal(sumarMeses('2026-09-21', 5), '2027-02-21');
  assert.equal(sumarMeses('2026-12-15', 12), '2027-12-15');
  assert.equal(sumarMeses('2026-03-31', 1), '2026-04-30');
});

test('el estado de vencimiento clasifica vencidos, inminentes y programados', () => {
  const referencia = '2026-09-21';
  assert.equal(estadoVencimiento('2026-09-10', 'programmato', referencia), 'vencido');
  assert.equal(estadoVencimiento('2026-09-21', 'programmato', referencia), 'oggi');
  assert.equal(estadoVencimiento('2026-09-25', 'programmato', referencia), 'imminente');
  assert.equal(estadoVencimiento(fechaMasDias(referencia, DIAS_PROXIMOS), 'programmato', referencia), 'prossimo');
  assert.equal(estadoVencimiento('2027-01-01', 'programmato', referencia), 'programmato');
  assert.equal(estadoVencimiento('2026-01-01', 'sospeso', referencia), 'sospeso');
});

test('el código de boleta sigue el formato BL-AAAAMM-NNNN', () => {
  assert.equal(formatearCodigoBoleta('2026-09-21', 12), 'BL-202609-0012');
});

test('el total de la boleta suma recambios y mano de obra', () => {
  const totales = calcularTotales(30, 2, 2);
  assert.equal(totales.manoDeObra, 260);
  assert.equal(totales.total, 290);
});

test('los recambios repetidos se agrupan por pieza', () => {
  assert.deepEqual(
    agruparRecambios([
      { pezzoId: 3, quantita: 1 },
      { pezzoId: 3, quantita: 2 },
      { pezzoId: 5, quantita: 4 }
    ]),
    [
      { pezzoId: 3, quantita: 3 },
      { pezzoId: 5, quantita: 4 }
    ]
  );
});

test('la similitud detecta el mismo cliente escrito de forma distinta', () => {
  assert.equal(similitud('Caffè Roma', 'Caffe Roma'), 1);
  assert.ok(similitud('Bar Centrale', 'CENTRALE BAR') > 0.7);
  assert.ok(similitud('Bar Centrale', 'Pizzeria Napoli') < 0.3);

  const coincidencia = mejorCoincidencia('caffe roma', [
    { id: 1, nome: 'Pizzeria Napoli', citta: 'Como' },
    { id: 2, nome: 'Caffè Roma', citta: 'Milano' }
  ]);
  assert.equal(coincidencia.id, 2);

  assert.equal(mejorCoincidencia('attività mai vista', [{ id: 1, nome: 'Pizzeria Napoli', citta: 'Como' }]), null);
});

test('la limpieza del nombre del OCR descarta ruido', () => {
  assert.equal(limpiarNombre('  "Bar   Centrale" '), 'Bar Centrale');
  assert.equal(limpiarNombre(''), null);
  assert.equal(normalizarNombre('Caffè  Roma!'), 'caffe roma');
});

test('el OCR elige la razón social y descarta totales y datos fiscales', () => {
  const texto = [
    'BAR CENTRALE',
    'di Rossi Marco',
    'Via Italia 9 - Monza',
    'P.IVA 01234567890',
    'Tel. 039 123456',
    '1x Guarnizione gruppo 18,00',
    'Manodopera 1,0 h 65,00',
    'TOTALE 83,00',
    'IVA 22% 14,96',
    'CONTANTE 83,00',
    'CASSA 1 OPERATORE 2',
    'DOCUMENTO COMMERCIALE'
  ].join('\n');
  const detectado = extraerNombreCliente(texto);
  assert.equal(detectado.nome, 'BAR CENTRALE');
  assert.ok(detectado.confidenza >= 0.5);

  assert.equal(extraerNombreCliente('TOTALE 83,00\nIVA 22%\nGrazie').nome, null);
});

test('el CSV de boletas escapa separadores y comillas', () => {
  const csv = boletasACsv([
    {
      codice_boleta: 'BL-202609-0001',
      data: '2026-09-21',
      stato: 'emessa',
      cliente: 'Bar "Centrale"; di Monza',
      codice_cliente: 'PRIV-0001',
      macchina: 'La Cimbali M100 MC-1',
      tecnico: 'Dev',
      ore: 2,
      persone: 1,
      ubicazione: 'cliente',
      esito: 'risolto',
      prezzo_totale: '148.50'
    }
  ]);
  assert.match(csv, /"Bar ""Centrale""; di Monza"/);
  assert.match(csv, /"148\.50"/);
  assert.equal(csv.split('\r\n').length, 2);
});

test('el CSV neutraliza fórmulas introducidas en nombres de cliente', () => {
  const csv = boletasACsv([
    {
      codice_boleta: 'BL-202609-0002',
      data: '2026-09-22',
      stato: 'emessa',
      cliente: '=HYPERLINK("http://malo")',
      codice_cliente: 'PRIV-0002',
      macchina: 'La Cimbali M100 MC-2',
      tecnico: 'Dev',
      ore: 1,
      persone: 1,
      ubicazione: 'cliente',
      esito: 'risolto',
      prezzo_totale: '10.00'
    }
  ]);
  assert.match(csv, /"'=HYPERLINK\(""http:\/\/malo""\)"/);
});

test('hoyIso devuelve una fecha ISO utilizable en SQL', () => {
  assert.match(hoyIso(), /^\d{4}-\d{2}-\d{2}$/);
});
