import { esCompleto } from './es.js';
import { it } from './it.js';

export const catalogo = { it, es: esCompleto };
export const IDIOMAS = ['it', 'es'];
export const IDIOMA_POR_DEFECTO = 'it';

export function obtenerCatalogo(idioma) {
  return catalogo[idioma] ?? catalogo[IDIOMA_POR_DEFECTO];
}
