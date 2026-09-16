import { spawnSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function listarArchivos(directorio) {
  const entradas = await readdir(directorio, { withFileTypes: true });
  const archivos = [];
  for (const entrada of entradas) {
    const ruta = path.join(directorio, entrada.name);
    if (entrada.isDirectory()) archivos.push(...(await listarArchivos(ruta)));
    else if (entrada.name.endsWith('.js')) archivos.push(ruta);
  }
  return archivos;
}

const archivos = (await listarArchivos(path.join(raiz, 'src'))).sort();
let fallos = 0;

for (const archivo of archivos) {
  const resultado = spawnSync(process.execPath, ['--check', archivo], { stdio: 'inherit' });
  if (resultado.status !== 0) fallos += 1;
}

if (fallos) {
  console.error(`\n${fallos} archivo(s) con errores de sintaxis.`);
  process.exit(1);
}

console.log(`Sintaxis correcta en ${archivos.length} archivo(s).`);
