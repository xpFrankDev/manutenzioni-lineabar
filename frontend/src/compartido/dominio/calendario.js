/**
 * Cálculo local de la próxima manutención para mostrarla antes de guardar.
 * El backend repite la operación al persistir; aquí solo se anticipa al
 * técnico sin desbordar el día cuando el mes destino es más corto.
 */
export function sumarMeses(fecha, meses) {
  const [anio, mes, dia] = String(fecha).split('-').map(Number);
  const destino = new Date(Date.UTC(anio, mes - 1 + Number(meses), 1));
  const ultimoDia = new Date(Date.UTC(destino.getUTCFullYear(), destino.getUTCMonth() + 1, 0)).getUTCDate();
  destino.setUTCDate(Math.min(dia, ultimoDia));
  return destino.toISOString().slice(0, 10);
}

export function proximasManutenciones(fecha, recambios = []) {
  return recambios
    .filter((recambio) => Number(recambio.intervallo_mesi) > 0)
    .map((recambio) => ({
      nome: recambio.nome,
      frecuenciaMeses: Number(recambio.intervallo_mesi),
      fecha: sumarMeses(fecha, recambio.intervallo_mesi)
    }));
}
