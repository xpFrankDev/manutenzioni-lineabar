/**
 * Etiqueta de origen del cliente: privado o proveedor (por ejemplo Romcafe o
 * La Cimbali). El tono solo cambia el color de la etiqueta, no el permiso.
 */
export function origenCliente(cliente, c) {
  const tipo = cliente?.cliente_tipo ?? cliente?.tipo_cliente;
  const proveedor = cliente?.cliente_fornitore ?? cliente?.fornitore ?? null;
  if (tipo !== 'fornitore' || !proveedor) {
    return { etiqueta: c.private, tono: 'private' };
  }
  if (/rom\s*cafe/i.test(proveedor)) return { etiqueta: proveedor, tono: 'romcafe' };
  if (/cimbali/i.test(proveedor)) return { etiqueta: proveedor, tono: 'cimbali' };
  return { etiqueta: proveedor, tono: 'supplier' };
}
