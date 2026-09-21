import assert from 'node:assert/strict';
import test from 'node:test';
import { proximasManutenciones, sumarMeses } from '../src/compartido/dominio/calendario.js';
import { importeManoDeObra, TARIFA_MANO_DE_OBRA_HORA } from '../src/compartido/dominio/mano-de-obra.js';
import { fechaDeHoy, formatearFecha, formatearMoneda } from '../src/compartido/utilidades/formato.js';

test('sumarMeses no desborda el fin de mes', () => {
  assert.equal(sumarMeses('2026-01-31', 1), '2026-02-28');
  assert.equal(sumarMeses('2026-09-21', 5), '2027-02-21');
  assert.equal(sumarMeses('2026-08-31', 6), '2027-02-28');
});

test('las próximas manutenciones solo consideran ricambios con intervalo', () => {
  const proximas = proximasManutenciones('2026-09-21', [
    { nome: 'Cartuccia', intervallo_mesi: 5 },
    { nome: 'Tubo', intervallo_mesi: null },
    { nome: 'Guarnizione', intervallo_mesi: 12 }
  ]);
  assert.deepEqual(proximas, [
    { nome: 'Cartuccia', frecuenciaMeses: 5, fecha: '2027-02-21' },
    { nome: 'Guarnizione', frecuenciaMeses: 12, fecha: '2027-09-21' }
  ]);
});

test('la mano de obra usa la tarifa por hora y persona', () => {
  assert.equal(TARIFA_MANO_DE_OBRA_HORA, 65);
  assert.equal(importeManoDeObra(2, 2), 260);
  assert.equal(importeManoDeObra(0.5, 1), 32.5);
});

test('el formato de moneda y fecha respeta el idioma', () => {
  assert.match(formatearMoneda(142.5, 'it'), /142,50/);
  assert.match(formatearMoneda(142.5, 'es'), /142,50/);
  assert.match(formatearFecha('2026-09-21', 'it'), /21/);
  assert.match(formatearFecha('2026-09-21 08:30:00', 'it'), /21/);
  assert.equal(formatearFecha(null, 'it'), '—');
  assert.equal(formatearFecha('data-non-valida', 'it'), '—');
});

test('fechaDeHoy devuelve el formato ISO que espera la API', () => {
  assert.match(fechaDeHoy(), /^\d{4}-\d{2}-\d{2}$/);
});
