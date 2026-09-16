import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { abrirConexionConEspera } from '../conexion-directa.js';

const directorioSemillas = path.dirname(fileURLToPath(import.meta.url));

const administrador = {
  codice_usuario: process.env.LINEABAR_ADMIN_USER || 'dev01',
  email: process.env.LINEABAR_ADMIN_EMAIL || 'dev@lineabar.it',
  nome: process.env.LINEABAR_ADMIN_NOMBRE || 'Sviluppatore Linea Bar',
  password: process.env.LINEABAR_ADMIN_PASSWORD
};

async function ejecutarArchivo(conexion, archivo) {
  const sentencias = await readFile(path.join(directorioSemillas, archivo), 'utf8');
  await conexion.query(sentencias);
}

async function asegurarAdministrador(conexion) {
  const [filas] = await conexion.query(
    'SELECT id,password_hash FROM utenti WHERE codice_usuario=? OR email=? LIMIT 1',
    [administrador.codice_usuario, administrador.email]
  );
  const existente = filas[0];

  if (existente) {
    if (!administrador.password) return;
    if (await bcrypt.compare(administrador.password, existente.password_hash)) return;
    const hash = await bcrypt.hash(administrador.password, 12);
    await conexion.query('UPDATE utenti SET password_hash=? WHERE id=?', [hash, existente.id]);
    console.log('Contraseña del administrador actualizada desde LINEABAR_ADMIN_PASSWORD.');
    return;
  }

  if (!administrador.password) {
    throw new Error(
      'No existe el usuario administrador inicial. Define LINEABAR_ADMIN_PASSWORD para crearlo.'
    );
  }

  const hash = await bcrypt.hash(administrador.password, 12);
  await conexion.query(
    'INSERT IGNORE INTO utenti (id,fk_ruolo,codice_usuario,nome,email,password_hash) VALUES (1,1,?,?,?,?)',
    [administrador.codice_usuario, administrador.nome, administrador.email, hash]
  );
  console.log(`Usuario administrador ${administrador.codice_usuario} creado.`);
}

async function sembrar() {
  const conexion = await abrirConexionConEspera();
  try {
    await ejecutarArchivo(conexion, 'datos-base.sql');
    console.log('Datos maestros sincronizados.');

    await asegurarAdministrador(conexion);

    if (process.env.LINEABAR_CARGAR_DEMO === '1') {
      await ejecutarArchivo(conexion, 'datos-demostracion.sql');
      console.log('Datos de demostración cargados.');
    }
  } finally {
    await conexion.end();
  }
}

sembrar().catch((error) => {
  console.error('Error al cargar la semilla:', error.message);
  process.exit(1);
});
