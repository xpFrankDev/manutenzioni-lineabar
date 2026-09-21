import { consultar, pool } from '../../base-datos/pool.js';

export const PARAMETROS_POR_DEFECTO = {
  tarifa_mano_de_obra_hora: 65,
  aviso_manutencion_dias: 7,
  horizonte_calendario_dias: 30,
  prevision_manutencion_meses: 6
};

export async function obtenerParametros(conexion = pool) {
  const filas = await consultar('SELECT chiave,valore FROM parametros WHERE stato="attivo"', [], conexion);
  const parametros = { ...PARAMETROS_POR_DEFECTO };
  for (const fila of filas) {
    const numero = Number(fila.valore);
    parametros[fila.chiave] = Number.isFinite(numero) && fila.valore !== '' ? numero : fila.valore;
  }
  return parametros;
}

export async function actualizarParametros(entradas, usuarioId, conexion = pool) {
  for (const entrada of entradas) {
    await conexion.execute(
      'UPDATE parametros SET valore=?,utente_modifica=? WHERE chiave=? AND stato="attivo"',
      [String(entrada.valore), usuarioId, entrada.chiave]
    );
  }
}
