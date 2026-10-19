import { z } from 'zod';
import { consultar, consultarUno, ejecutar } from '../../base-datos/pool.js';
import { nuevoId } from '../../utilidades/identificadores.js';
import { analizarImagenEntrada } from '../../utilidades/imagenes.js';

export const TIPOS_MAQUINA = ['macchina_caffe', 'produttore_ghiaccio', 'lavastoviglie', 'filtro', 'addolcitore'];

export const esquemaMaquina = z.object({
  fk_cliente: z.string().uuid(),
  fk_fornitore: z.string().uuid().nullable().optional(),
  fk_marca: z.string().uuid().nullable().optional(),
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
    await conexion.execute('INSERT IGNORE INTO marche (id,nome) VALUES (?,?)', [nuevoId(), fornitore.nome]);
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
  const id = nuevoId();
  await conexion.execute(
    'INSERT INTO macchine (id,fk_cliente,fk_marca,fk_fornitore,codice_unico,tipo_macchina,modello,stato,utente_crea,utente_modifica) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [
      id,
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
  await otorgarAccesoMaquina(conexion, id, usuarioId);
  return { id, marcaId };
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
      id
    ]
  );
  return { id, marcaId };
}

/** Da acceso de lectura a la ficha de una máquina (idempotente). */
export async function otorgarAccesoMaquina(conexion, maquinaId, usuarioId) {
  await conexion.execute(
    'INSERT INTO macchine_utenti (fk_macchina,fk_utente,stato,utente_crea,utente_modifica) VALUES (?,?,"attivo",?,?) ON DUPLICATE KEY UPDATE stato="attivo",utente_modifica=VALUES(utente_modifica)',
    [maquinaId, usuarioId, usuarioId, usuarioId]
  );
}

/** Un administrador ve todas las máquinas; un técnico solo las autorizadas. */
export async function puedeAccederMaquina(usuario, maquinaId) {
  if (!usuario) return false;
  if (usuario.ruolo !== 'tecnico') return true;
  const fila = await consultarUno(
    'SELECT 1 ok FROM macchine_utenti WHERE fk_macchina=? AND fk_utente=? AND stato="attivo"',
    [maquinaId, usuario.sub]
  );
  return Boolean(fila);
}

export async function listarFotosMaquina(maquinaId) {
  return consultar(
    'SELECT id,nome_file,tipo_mime,dimensione,didascalia,ordine,creato_at,utente_crea FROM macchine_foto WHERE fk_macchina=? AND stato="attivo" ORDER BY ordine,creato_at',
    [maquinaId]
  );
}

export async function listarAccesosMaquina(maquinaId) {
  return consultar(
    `SELECT u.id,u.nome,u.codice_usuario,(mu.fk_utente IS NOT NULL) accesso
       FROM utenti u
       JOIN ruoli r ON r.id=u.fk_ruolo
       LEFT JOIN macchine_utenti mu ON mu.fk_macchina=? AND mu.fk_utente=u.id AND mu.stato="attivo"
      WHERE r.codice="tecnico" AND u.stato="attivo"
      ORDER BY u.nome`,
    [maquinaId]
  );
}

export async function sincronizarAccesosMaquina(conexion, maquinaId, usuarios, actorId) {
  await conexion.execute('UPDATE macchine_utenti SET stato="inactivo",utente_modifica=? WHERE fk_macchina=?', [
    actorId,
    maquinaId
  ]);
  for (const usuarioId of usuarios) {
    await conexion.execute(
      'INSERT INTO macchine_utenti (fk_macchina,fk_utente,stato,utente_crea,utente_modifica) VALUES (?,?,"attivo",?,?) ON DUPLICATE KEY UPDATE stato="attivo",utente_modifica=VALUES(utente_modifica)',
      [maquinaId, usuarioId, actorId, actorId]
    );
  }
  return usuarios.length;
}

export async function obtenerDetalleMaquina(maquinaId) {
  const maquina = await consultarUno(
    `SELECT m.id,m.codice_unico,m.tipo_macchina,m.modello,m.stato,m.creato_at,m.modificato_at,
            c.id cliente_id,c.codice cliente_codice,c.nome cliente,c.indirizzo cliente_indirizzo,c.citta cliente_citta,c.tipo_cliente cliente_tipo,
            f.id fornitore_id,f.codice fornitore_codice,f.nome fornitore,
            ma.id marca_id,ma.nome marca
       FROM macchine m
       JOIN clienti c ON c.id=m.fk_cliente
       LEFT JOIN fornitori f ON f.id=m.fk_fornitore
       LEFT JOIN marche ma ON ma.id=m.fk_marca
      WHERE m.id=?`,
    [maquinaId]
  );
  if (!maquina) return null;

  const foto = await listarFotosMaquina(maquinaId);
  const manutenzioni = await consultar(
    `SELECT m.id,m.data,m.ubicazione,m.note,m.esito,m.ore,m.persone,m.creato_at,
            u.nome tecnico,b.id boleta_id,b.codice_boleta,b.stato boleta_stato,b.prezzo_totale
       FROM manutenzioni m
       JOIN macchine_manutenzioni mm ON mm.fk_manutenzione=m.id AND mm.stato="attivo"
       JOIN utenti u ON u.id=m.fk_tecnico
       LEFT JOIN boletas_manutenzioni bm ON bm.fk_manutenzione=m.id AND bm.stato="attivo"
       LEFT JOIN boletas b ON b.id=bm.fk_boleta AND b.stato<>"annullata"
      WHERE mm.fk_macchina=? AND m.stato="attivo"
      ORDER BY m.data DESC,m.id DESC`,
    [maquinaId]
  );

  if (manutenzioni.length) {
    const marcadores = manutenzioni.map(() => '?').join(',');
    const ricambi = await consultar(
      `SELECT pm.fk_manutenzione,p.nome,p.codice_unico,pm.quantita,pm.prezzo_unitario
         FROM pezzi_manutenzioni pm
         JOIN pezzi p ON p.id=pm.fk_pezzo
        WHERE pm.stato="attivo" AND pm.fk_manutenzione IN (${marcadores})`,
      manutenzioni.map((fila) => fila.id)
    );
    const porManutencion = new Map();
    for (const recambio of ricambi) {
      if (!porManutencion.has(recambio.fk_manutenzione)) porManutencion.set(recambio.fk_manutenzione, []);
      porManutencion.get(recambio.fk_manutenzione).push(recambio);
    }
    for (const fila of manutenzioni) fila.ricambi = porManutencion.get(fila.id) ?? [];
  }

  const prossime = await consultar(
    `SELECT c.id,c.prossima_manutenzione,c.frequenza_mesi,c.stato_calendario,p.nome pezzo
       FROM calendario_manutenzioni_macchine c
       LEFT JOIN pezzi p ON p.id=c.fk_pezzo
      WHERE c.fk_macchina=? AND c.stato="attivo"
      ORDER BY c.prossima_manutenzione`,
    [maquinaId]
  );

  return { ...maquina, foto, manutenzioni, prossime };
}

export async function guardarFotoMaquina(maquinaId, datos, usuarioId) {
  const { tipoMime, base64, bytes, nombreFile } = analizarImagenEntrada(datos, { maximoBytes: 6 * 1024 * 1024 });
  const id = nuevoId();
  const orden = await consultarUno(
    'SELECT COALESCE(MAX(ordine),0)+1 orden FROM macchine_foto WHERE fk_macchina=? AND stato="attivo"',
    [maquinaId]
  );
  const didascalia = datos.didascalia ? String(datos.didascalia).trim().slice(0, 255) : null;
  await ejecutar(
    'INSERT INTO macchine_foto (id,fk_macchina,nome_file,tipo_mime,dimensione,immagine,didascalia,ordine,utente_crea,utente_modifica) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [id, maquinaId, nombreFile, tipoMime, bytes, Buffer.from(base64, 'base64'), didascalia, orden.orden, usuarioId, usuarioId]
  );
  return { id, nome_file: nombreFile, tipo_mime: tipoMime, dimensione: bytes, didascalia, ordine: orden.orden };
}

export async function obtenerImagenMaquina(maquinaId, fotoId) {
  return consultarUno(
    'SELECT tipo_mime,immagine FROM macchine_foto WHERE id=? AND fk_macchina=? AND stato="attivo"',
    [fotoId, maquinaId]
  );
}

/** Devuelve `true` si eliminó, `null` si el usuario no tiene permiso. */
export async function eliminarFotoMaquina(maquinaId, fotoId, usuario) {
  const foto = await consultarUno(
    'SELECT id,utente_crea FROM macchine_foto WHERE id=? AND fk_macchina=? AND stato="attivo"',
    [fotoId, maquinaId]
  );
  if (!foto) return false;
  if (usuario.ruolo === 'tecnico' && foto.utente_crea !== usuario.sub) return null;
  await consultar('UPDATE macchine_foto SET stato="inactivo",utente_modifica=? WHERE id=?', [usuario.sub, fotoId]);
  return true;
}
