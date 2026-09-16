import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrirConexionConEspera } from '../conexion-directa.js';

const directorioMigraciones = path.dirname(fileURLToPath(import.meta.url));
const tablaControl = 'migraciones_aplicadas';

async function existeTabla(conexion, nombre) {
  const [filas] = await conexion.query(
    'SELECT COUNT(*) total FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    [nombre]
  );
  return Number(filas[0].total) > 0;
}

async function listarArchivos() {
  const archivos = await readdir(directorioMigraciones);
  return archivos.filter((archivo) => archivo.endsWith('.sql')).sort();
}

async function nombresAplicados(conexion) {
  const [filas] = await conexion.query(`SELECT nombre FROM ${tablaControl}`);
  return new Set(filas.map((fila) => fila.nombre));
}

async function registrar(conexion, nombre) {
  await conexion.query(`INSERT IGNORE INTO ${tablaControl} (nombre) VALUES (?)`, [nombre]);
}

async function ejecutar() {
  const conexion = await abrirConexionConEspera();
  try {
    const controlExistia = await existeTabla(conexion, tablaControl);
    const esquemaPrevio = await existeTabla(conexion, 'ruoli');

    await conexion.query(
      `CREATE TABLE IF NOT EXISTS ${tablaControl} (
        nombre VARCHAR(191) PRIMARY KEY,
        aplicada_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`
    );

    const archivos = await listarArchivos();
    const aplicadas = await nombresAplicados(conexion);

    // Instalación existente anterior al control de versiones: el esquema ya
    // está aplicado, así que solo se registra como histórico.
    if (!controlExistia && esquemaPrevio) {
      for (const archivo of archivos) await registrar(conexion, archivo);
      console.log(`Migraciones registradas como ya aplicadas: ${archivos.length}.`);
      return;
    }

    let pendientes = 0;
    for (const archivo of archivos) {
      if (aplicadas.has(archivo)) continue;
      pendientes += 1;
      console.log(`Aplicando ${archivo}`);
      const sentencias = await readFile(path.join(directorioMigraciones, archivo), 'utf8');
      await conexion.query(sentencias);
      await registrar(conexion, archivo);
    }
    console.log(pendientes ? `Migraciones aplicadas: ${pendientes}.` : 'No hay migraciones pendientes.');
  } finally {
    await conexion.end();
  }
}

ejecutar().catch((error) => {
  console.error('Error al aplicar migraciones:', error.message);
  process.exit(1);
});
