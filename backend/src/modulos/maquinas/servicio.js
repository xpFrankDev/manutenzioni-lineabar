import { z } from 'zod';
import { consultarUno } from '../../base-datos/pool.js';

export const TIPOS_MAQUINA = ['macchina_caffe', 'produttore_ghiaccio', 'lavastoviglie', 'filtro', 'addolcitore'];

export const esquemaMaquina = z.object({
  fk_cliente: z.coerce.number().int().positive(),
  fk_fornitore: z.coerce.number().int().positive().nullable().optional(),
  fk_marca: z.coerce.number().int().positive().nullable().optional(),
  codice_unico: z.string().trim().min(4).max(50),
  tipo_macchina: z.enum(TIPOS_MAQUINA),
  modello: z.string().trim().max(100).nullable().optional(),
  stato: z.enum(['attivo', 'inattivo']).default('attivo')
});

export function normalizarMaquina(datos) {
  const maquina = esquemaMaquina.parse(datos ?? {});
  return {
    ...maquina,
    codice_unico: maquina.codice_unico.toUpperCase(),
    modello: maquina.modello || null,
    fk_fornitore: maquina.fk_fornitore ?? null,
    fk_marca: maquina.fk_marca ?? null
  };
}

/**
 * Resuelve la marca de la máquina: la elegida explícitamente, la del
 * proveedor cuando existe (creándola si es la primera máquina de ese
 * proveedor) o, como último recurso, la primera marca activa.
 */
export async function resolverMarca(maquina, conexion) {
  if (maquina.fk_marca) {
    const marca = await consultarUno('SELECT id FROM marche WHERE id=? AND stato="attivo"', [maquina.fk_marca], conexion);
    if (!marca) throw new Error('Marca non trovata');
    return marca.id;
  }

  if (maquina.fk_fornitore) {
    const fornitore = await consultarUno('SELECT nome FROM fornitori WHERE id=? AND stato="attivo"', [maquina.fk_fornitore], conexion);
    if (!fornitore) throw new Error('Fornitore non trovato');
    await conexion.execute('INSERT IGNORE INTO marche (nome) VALUES (?)', [fornitore.nome]);
    const marca = await consultarUno('SELECT id FROM marche WHERE nome=?', [fornitore.nome], conexion);
    return marca.id;
  }

  const marca = await consultarUno('SELECT id FROM marche WHERE stato="attivo" ORDER BY id LIMIT 1', [], conexion);
  if (!marca) throw new Error('Configura almeno una marca');
  return marca.id;
}

export async function crearMaquina(conexion, datos, usuarioId) {
  const maquina = normalizarMaquina(datos);
  const marcaId = await resolverMarca(maquina, conexion);
  const [resultado] = await conexion.execute(
    'INSERT INTO macchine (fk_cliente,fk_marca,fk_fornitore,codice_unico,tipo_macchina,modello,stato,utente_crea,utente_modifica) VALUES (?,?,?,?,?,?,?,?,?)',
    [
      maquina.fk_cliente,
      marcaId,
      maquina.fk_fornitore,
      maquina.codice_unico,
      maquina.tipo_macchina,
      maquina.modello,
      maquina.stato,
      usuarioId,
      usuarioId
    ]
  );
  return { id: resultado.insertId, marcaId };
}

export async function actualizarMaquina(conexion, id, datos, usuarioId) {
  const maquina = normalizarMaquina(datos);
  const marcaId = await resolverMarca(maquina, conexion);
  await conexion.execute(
    'UPDATE macchine SET fk_cliente=?,fk_marca=?,fk_fornitore=?,codice_unico=?,tipo_macchina=?,modello=?,stato=?,utente_modifica=? WHERE id=?',
    [
      maquina.fk_cliente,
      marcaId,
      maquina.fk_fornitore,
      maquina.codice_unico,
      maquina.tipo_macchina,
      maquina.modello,
      maquina.stato,
      usuarioId,
      Number(id)
    ]
  );
  return { id: Number(id), marcaId };
}
