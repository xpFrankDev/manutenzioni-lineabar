/**
 * Inspección de solo lectura: cuántas filas hay en cada tabla y cuáles están
 * vacías. Sirve para comprobar si una instalación tiene datos reales, datos de
 * demostración o una mezcla, sin modificar nada.
 *
 * Uso: npm run datos:estado
 */
import { abrirConexionConEspera } from '../src/base-datos/conexion-directa.js';

const conexion = await abrirConexionConEspera({ multipleStatements: false });
try {
  const [tablas] = await conexion.query(
    "SELECT TABLE_NAME tabla FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME"
  );

  const filas = [];
  for (const { tabla } of tablas) {
    const [resultado] = await conexion.query(`SELECT COUNT(*) total FROM \`${tabla}\``);
    filas.push({ tabla, total: Number(resultado[0].total) });
  }

  const ancho = Math.max(...filas.map((fila) => fila.tabla.length), 10);
  console.log(`Base: ${process.env.MARIADB_DATABASE ?? '(sin nombre)'}`);
  console.log(`${'TABLA'.padEnd(ancho)}  FILAS`);
  for (const fila of filas) {
    console.log(`${fila.tabla.padEnd(ancho)}  ${String(fila.total).padStart(6)}`);
  }

  const vacias = filas.filter((fila) => fila.total === 0).map((fila) => fila.tabla);
  console.log(`\nTablas vacías (${vacias.length}): ${vacias.length ? vacias.join(', ') : 'ninguna'}`);
  console.log(`Total de filas: ${filas.reduce((suma, fila) => suma + fila.total, 0)}`);
} finally {
  await conexion.end();
}
