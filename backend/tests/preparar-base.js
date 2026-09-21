import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.MARIADB_DATABASE || 'lineabar_test';

if (!/^lineabar_test/.test(base)) {
  console.error(`La base de pruebas debe empezar por lineabar_test (recibido: ${base}).`);
  process.exit(1);
}

const conexion = await mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3308),
  user: process.env.LINEABAR_MIGRATIONS_USER || process.env.LINEABAR_DB_USER,
  password: process.env.LINEABAR_MIGRATIONS_PASSWORD || process.env.LINEABAR_DB_PASSWORD,
  multipleStatements: true
});

await conexion.query(`DROP DATABASE IF EXISTS \`${base}\``);
await conexion.query(`CREATE DATABASE \`${base}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
await conexion.end();
console.log(`Base de pruebas ${base} recreada.`);

const entorno = {
  ...process.env,
  MARIADB_DATABASE: base,
  LINEABAR_DB_USER: process.env.LINEABAR_MIGRATIONS_USER || process.env.LINEABAR_DB_USER,
  LINEABAR_DB_PASSWORD: process.env.LINEABAR_MIGRATIONS_PASSWORD || process.env.LINEABAR_DB_PASSWORD,
  LINEABAR_CARGAR_DEMO: '1',
  LINEABAR_ADMIN_PASSWORD: process.env.LINEABAR_TEST_ADMIN_PASSWORD || 'prueba-test-2026'
};

for (const guion of ['migraciones', 'sembrar']) {
  const resultado = spawnSync('npm', ['run', guion], { cwd: raiz, env: entorno, stdio: 'inherit' });
  if (resultado.status !== 0) process.exit(resultado.status ?? 1);
}
