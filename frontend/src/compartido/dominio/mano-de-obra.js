export const TARIFA_MANO_DE_OBRA_HORA = 65;

export function importeManoDeObra(horas, personas, tarifa = TARIFA_MANO_DE_OBRA_HORA) {
  return horas * personas * Number(tarifa ?? TARIFA_MANO_DE_OBRA_HORA);
}
