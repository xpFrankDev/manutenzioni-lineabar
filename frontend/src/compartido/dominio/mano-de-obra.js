export const TARIFA_MANO_DE_OBRA_HORA = 65;

export function importeManoDeObra(horas, personas) {
  return horas * personas * TARIFA_MANO_DE_OBRA_HORA;
}
