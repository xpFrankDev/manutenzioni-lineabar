import assert from 'node:assert/strict';
import test from 'node:test';
import { coordenadasDesdeMapa } from '../../src/modulos/clientes/servicio.js';
import { minutosViaje } from '../../src/modulos/programmaciones/servicio.js';

const AQUILA = { clienteId: 'a', citta: 'L’Aquila', latitudine: 42.3498, longitudine: 13.3995 };
const AQUILA_CERCA = { clienteId: 'b', citta: 'L’Aquila', latitudine: 42.354, longitudine: 13.402 };
const PESCASSEROLI = { clienteId: 'c', citta: 'Pescasseroli', latitudine: 41.808, longitudine: 13.79 };

test('las coordenadas se extraen de los enlaces de Google Maps', () => {
  assert.deepEqual(coordenadasDesdeMapa('https://www.google.com/maps/@42.3498,13.3995,15z'), {
    latitudine: 42.3498,
    longitudine: 13.3995
  });
  assert.deepEqual(coordenadasDesdeMapa('https://www.google.com/maps/search/?api=1&query=42.3498,13.3995'), {
    latitudine: 42.3498,
    longitudine: 13.3995
  });
  assert.deepEqual(coordenadasDesdeMapa('https://example.com/sin-coordenadas'), {
    latitudine: null,
    longitudine: null
  });
});

test('la estimación de viaje agrupa la misma ciudad y separa localidades lejanas', () => {
  const mismaCiudad = minutosViaje(AQUILA, AQUILA_CERCA);
  assert.ok(mismaCiudad >= 5 && mismaCiudad <= 30);
  assert.ok(minutosViaje(AQUILA, PESCASSEROLI) > 30);
});
