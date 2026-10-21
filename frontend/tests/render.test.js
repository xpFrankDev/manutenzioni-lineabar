import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { rolldown } from 'rolldown';

/**
 * Renderiza las pantallas con React en el servidor para comprobar que la
 * interfaz se monta sin errores. El bundle temporal usa el mismo transformador
 * de JSX que la compilación de Vite.
 */
test('las pantallas principales se renderizan sin errores', async () => {
  const entrada = path.join(import.meta.dirname, 'render', 'entrada.jsx');
  const salida = path.join(os.tmpdir(), `lineabar-render-${Date.now()}.mjs`);
  const paquete = await rolldown({ input: entrada, platform: 'node' });
  await paquete.write({ file: salida, format: 'esm' });
  await paquete.close();

  const { renderizarPantallas } = await import(pathToFileURL(salida).href);
  const pantallas = renderizarPantallas();

  assert.match(pantallas.login, /Linea Bar/);
  assert.match(pantallas.login, /Contraseña/);
  assert.match(pantallas.boleta, /Nuevo cliente/);
  assert.match(pantallas.boleta, /Escanear scontrino/);
  assert.match(pantallas.boleta, /Cliente/);
  assert.match(pantallas.mantenimiento, /Mantenimiento interno en almacén/);
  assert.match(pantallas.mantenimiento, /Selecciona el cliente/);
  assert.match(pantallas.calendario, /Calendario/);
  assert.match(pantallas.reportes, /Informes/);
  assert.match(pantallas.configuracion, /Datos configurables/);
  assert.match(pantallas.actividades, /Tareas/);
  assert.match(pantallas.maquinas, /Máquinas/);
  assert.match(pantallas.maquina, /skeleton/);
  assert.match(pantallas.programmazione, /Programación/);
  assert.match(pantallas.error403, /Acceso reservado/);
  assert.match(pantallas.estados, /Vencido/);
  assert.match(pantallas.estados, /Completada/);
});
