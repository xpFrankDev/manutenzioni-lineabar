import mysql from 'mysql2/promise';
import { entorno } from '../configuracion/entorno.js';

export const pool = mysql.createPool({
  host: entorno.baseDatos.host,
  port: entorno.baseDatos.puerto,
  user: entorno.baseDatos.usuario,
  password: entorno.baseDatos.contrasena,
  database: entorno.baseDatos.nombre,
  waitForConnections: true,
  connectionLimit: 5,
  // Las fechas viajan como texto ISO a la API: evita desfases de zona horaria
  // entre el contenedor de MariaDB y el navegador del técnico.
  dateStrings: true
});

export async function consultar(sql, valores = [], conexion = pool) {
  const [filas] = await conexion.execute(sql, valores);
  return filas;
}

export async function consultarUno(sql, valores = [], conexion = pool) {
  const filas = await consultar(sql, valores, conexion);
  return filas[0] ?? null;
}

/** Ejecuta una sentencia de escritura y devuelve el resultado del driver. */
export async function ejecutar(sql, valores = [], conexion = pool) {
  const [resultado] = await conexion.execute(sql, valores);
  return resultado;
}

export async function enTransaccion(tarea) {
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const resultado = await tarea(conexion);
    await conexion.commit();
    return resultado;
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}
