import mysql from 'mysql2/promise';
import { entorno } from '../configuracion/entorno.js';

/**
 * Conexión sin pool y con múltiples sentencias por llamada: la usan las
 * herramientas de migración y de semilla, cuyos archivos SQL contienen varios
 * comandos. El resto de la aplicación usa el pool parametrizado.
 */
export function abrirConexion({ multipleStatements = true } = {}) {
  return mysql.createConnection({
    host: entorno.baseDatos.host,
    port: entorno.baseDatos.puerto,
    user: entorno.baseDatos.usuario,
    password: entorno.baseDatos.contrasena,
    database: entorno.baseDatos.nombre,
    multipleStatements
  });
}

/**
 * MariaDB puede responder al healthcheck por socket antes de aceptar conexiones
 * TCP. Las herramientas de arranque reintentan en lugar de fallar.
 */
export async function abrirConexionConEspera({ multipleStatements = true, intentos = 30, esperaMs = 1000 } = {}) {
  let ultimoError;
  for (let intento = 1; intento <= intentos; intento += 1) {
    try {
      return await abrirConexion({ multipleStatements });
    } catch (error) {
      ultimoError = error;
      console.log(`Esperando a MariaDB (intento ${intento}/${intentos}): ${error.code ?? error.message}`);
      await new Promise((resolver) => setTimeout(resolver, esperaMs));
    }
  }
  throw ultimoError;
}
