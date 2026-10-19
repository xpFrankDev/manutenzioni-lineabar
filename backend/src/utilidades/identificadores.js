import crypto from 'node:crypto';

/**
 * Identificador público de todas las entidades. Las tablas usan UUID y no
 * autoincrementales, de modo que una máquina, manutención o boleta nunca se
 * relaciona por un número correlativo.
 */
export function nuevoId() {
  return crypto.randomUUID();
}

export function esUuid(valor) {
  return typeof valor === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor);
}
