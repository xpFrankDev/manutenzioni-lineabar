import { consultarUno } from '../../base-datos/pool.js';

export const TARIFA_MANO_DE_OBRA_HORA = 65;

function prefijoCodigo(fecha) {
  return `BL-${fecha.slice(0, 7).replace('-', '')}-`;
}

export function formatearCodigoBoleta(fecha, progresivo) {
  return `${prefijoCodigo(fecha)}${String(progresivo).padStart(4, '0')}`;
}

export async function proximoCodigoBoleta(conexion, fecha) {
  const fila = await consultarUno(
    'SELECT COUNT(*) totale FROM boletas WHERE codice_boleta LIKE ?',
    [`${prefijoCodigo(fecha)}%`],
    conexion
  );
  return formatearCodigoBoleta(fecha, Number(fila?.totale ?? 0) + 1);
}

export function calcularTotales(recambios, horas, personas) {
  const manoDeObra = horas * personas * TARIFA_MANO_DE_OBRA_HORA;
  return { manoDeObra, total: recambios + manoDeObra };
}
