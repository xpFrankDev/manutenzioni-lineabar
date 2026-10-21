import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { consultarUno, pool } from '../../base-datos/pool.js';
import { nuevoId } from '../../utilidades/identificadores.js';
import { crearCliente, normalizarCliente } from '../clientes/servicio.js';
import { actualizarMaquina, crearMaquina, normalizarMaquina, TIPOS_MAQUINA } from '../maquinas/servicio.js';

const ROLES_USUARIO = ['amministratore', 'tecnico'];

export { TIPOS_MAQUINA };

const esquemaCaracteristicas = z
  .array(
    z.object({
      tipoCaratteristicaId: z.string().uuid(),
      quantita: z.coerce.number().positive().max(99999)
    })
  )
  .max(30)
  .default([]);

export const catalogoConfigurable = {
  fornitori: {
    tabla: 'fornitori',
    columnas: ['codice', 'nome', 'stato'],
    listado: 'SELECT id,codice,nome,stato FROM fornitori ORDER BY stato DESC,nome',
    validar: (datos) => ({
      codice: z.string().trim().min(2).max(30).parse(datos.codice).toUpperCase(),
      nome: z.string().trim().min(2).max(120).parse(datos.nome),
      stato: datos.stato === 'inattivo' ? 'inattivo' : 'attivo'
    })
  },
  clienti: {
    tabla: 'clienti',
    propio: true,
    listado:
      'SELECT c.id,c.codice,c.nome,c.tipo_cliente,c.indirizzo,c.url_mappe,c.latitudine,c.longitudine,c.citta,c.fk_fornitore,c.ultimo_manutenzione,c.stato,f.nome fornitore FROM clienti c LEFT JOIN fornitori f ON f.id=c.fk_fornitore ORDER BY c.stato DESC,c.nome',
    validar: (datos) => normalizarCliente(datos)
  },
  macchine: {
    tabla: 'macchine',
    propio: true,
    listado:
      'SELECT m.id,m.codice_unico,m.matricola,m.tipo_macchina,m.modello,m.fk_cliente,m.fk_fornitore,m.fk_marca,m.stato,c.nome cliente,c.indirizzo,c.tipo_cliente,cf.nome cliente_fornitore,COALESCE(f.nome,ma.nome) fornitore FROM macchine m JOIN clienti c ON c.id=m.fk_cliente LEFT JOIN fornitori cf ON cf.id=c.fk_fornitore LEFT JOIN fornitori f ON f.id=m.fk_fornitore LEFT JOIN marche ma ON ma.id=m.fk_marca ORDER BY m.stato DESC,c.nome,m.modello',
    validar: (datos) => normalizarMaquina(datos)
  },
  marche: {
    tabla: 'marche',
    columnas: ['nome', 'stato'],
    listado: 'SELECT id,nome,stato FROM marche ORDER BY stato DESC,nome',
    validar: (datos) => ({
      nome: z.string().trim().min(2).max(100).parse(datos.nome),
      stato: datos.stato === 'inattivo' ? 'inattivo' : 'attivo'
    })
  },
  pezzi: {
    tabla: 'pezzi',
    columnas: ['fk_marca', 'nome', 'codice_unico', 'tipo_macchina', 'prezzo', 'intervallo_mesi', 'stato'],
    listado:
      'SELECT p.id,p.nome,p.codice_unico,p.tipo_macchina,CAST(p.prezzo AS DECIMAL(10,2)) prezzo,p.intervallo_mesi,p.fk_marca,p.stato,ma.nome marca,(SELECT GROUP_CONCAT(CONCAT(ptc.fk_tipo_caratteristica,":",CAST(ptc.quantita AS DOUBLE)) SEPARATOR ";") FROM pezzi_tipi_caratteristiche ptc WHERE ptc.fk_pezzo=p.id AND ptc.stato="attivo") caratteristiche,(SELECT GROUP_CONCAT(CONCAT(t.nome," ",CAST(ptc.quantita AS DOUBLE),COALESCE(CONCAT(" ",t.unita_misura),"")) SEPARATOR ", ") FROM pezzi_tipi_caratteristiche ptc JOIN tipi_caratteristiche t ON t.id=ptc.fk_tipo_caratteristica WHERE ptc.fk_pezzo=p.id AND ptc.stato="attivo") caratteristiche_label FROM pezzi p LEFT JOIN marche ma ON ma.id=p.fk_marca ORDER BY p.stato DESC,p.nome',
    validar: (datos) => ({
      fk_marca: datos.fk_marca ? z.string().uuid().parse(datos.fk_marca) : null,
      nome: z.string().trim().min(2).max(150).parse(datos.nome),
      codice_unico: z.string().trim().min(4).max(60).parse(datos.codice_unico).toUpperCase(),
      tipo_macchina: z.enum(TIPOS_MAQUINA).parse(datos.tipo_macchina),
      prezzo: z.coerce.number().min(0).max(99999).parse(datos.prezzo),
      intervallo_mesi:
        datos.intervallo_mesi === '' || datos.intervallo_mesi == null
          ? null
          : z.coerce.number().int().min(1).max(120).parse(datos.intervallo_mesi),
      stato: datos.stato === 'inattivo' ? 'inattivo' : 'attivo',
      caratteristiche: esquemaCaracteristicas.parse(datos.caratteristiche ?? [])
    })
  },
  caratteristiche: {
    tabla: 'tipi_caratteristiche',
    columnas: ['codice_unico', 'nome', 'unita_misura', 'stato'],
    listado: 'SELECT id,codice_unico,nome,unita_misura,stato FROM tipi_caratteristiche ORDER BY stato DESC,nome',
    validar: (datos) => ({
      codice_unico: z.string().trim().min(2).max(50).parse(datos.codice_unico).toUpperCase(),
      nome: z.string().trim().min(2).max(120).parse(datos.nome),
      unita_misura: z.string().trim().max(30).optional().parse(datos.unita_misura || '') || null,
      stato: datos.stato === 'inattivo' ? 'inattivo' : 'attivo'
    })
  },
  utenti: {
    tabla: 'utenti',
    propio: true,
    protegido: true,
    listado:
      'SELECT u.id,u.codice_usuario,u.nome,u.email,u.stato,r.codice ruolo FROM utenti u JOIN ruoli r ON r.id=u.fk_ruolo ORDER BY u.stato DESC,u.nome',
    validar: (datos) => ({
      nome: z.string().trim().min(2).max(120).parse(datos.nome),
      codice_usuario: z.string().trim().min(5).max(40).parse(datos.codice_usuario).toLowerCase(),
      email: z.string().trim().email().max(190).parse(datos.email),
      ruolo: z.enum(ROLES_USUARIO).parse(datos.ruolo ?? 'tecnico'),
      password: datos.password ? z.string().min(8).max(128).parse(datos.password) : null,
      stato: datos.stato === 'inattivo' ? 'inattivo' : 'attivo'
    })
  },
  modelli: {
    tabla: 'modelli_macchina',
    columnas: ['fk_marca', 'nome', 'tipo_macchina', 'immagine_url', 'scheda_url', 'note', 'stato'],
    listado:
      'SELECT m.id,m.fk_marca,m.nome,m.tipo_macchina,m.immagine_url,m.scheda_url,m.note,m.stato,ma.nome marca FROM modelli_macchina m JOIN marche ma ON ma.id=m.fk_marca ORDER BY m.stato DESC,ma.nome,m.nome',
    validar: (datos) => ({
      fk_marca: z.string().uuid().parse(datos.fk_marca),
      nome: z.string().trim().min(2).max(120).parse(datos.nome),
      tipo_macchina: z.enum(TIPOS_MAQUINA).parse(datos.tipo_macchina),
      immagine_url: z.string().trim().max(1000).optional().nullable().parse(datos.immagine_url || null),
      scheda_url: z.string().trim().max(1000).optional().nullable().parse(datos.scheda_url || null),
      note: z.string().trim().max(255).optional().nullable().parse(datos.note || null),
      stato: datos.stato === 'inattivo' ? 'inattivo' : 'attivo'
    })
  },
  parametri: {
    tabla: 'parametros',
    columnas: ['chiave', 'valore', 'descrizione', 'stato'],
    listado: 'SELECT id,chiave,valore,descrizione,stato FROM parametros ORDER BY chiave',
    validar: (datos) => ({
      chiave: z.string().trim().min(3).max(60).parse(datos.chiave).toLowerCase().replace(/\s+/g, '_'),
      valore: z.union([z.string().trim().min(1).max(190), z.coerce.number()]).parse(datos.valore).toString(),
      descrizione: z.string().trim().max(255).optional().parse(datos.descrizione || '') || null,
      stato: datos.stato === 'inattivo' ? 'inattivo' : 'attivo'
    })
  }
};

export function obtenerCatalogo(recurso) {
  return catalogoConfigurable[recurso] ?? null;
}

export async function prepararRegistro(recurso, catalogo, datos, opciones = {}) {
  const registro = catalogo.validar(datos);
  if (recurso === 'utenti' && opciones.esCreacion && !registro.password) {
    throw new Error('Indica una password di almeno 8 caratteri');
  }
  return registro;
}

async function idRol(codigo, conexion) {
  const rol = await consultarUno('SELECT id FROM ruoli WHERE codice=?', [codigo], conexion);
  if (!rol) throw new Error('Ruolo non disponibile');
  return rol.id;
}

async function crearUsuario(conexion, registro, usuarioId) {
  const hash = await bcrypt.hash(registro.password, 12);
  const id = nuevoId();
  try {
    await conexion.execute(
      'INSERT INTO utenti (id,fk_ruolo,codice_usuario,nome,email,password_hash,stato,utente_crea,utente_modifica) VALUES (?,?,?,?,?,?,?,?,?)',
      [
        id,
        await idRol(registro.ruolo, conexion),
        registro.codice_usuario,
        registro.nome,
        registro.email,
        hash,
        registro.stato,
        usuarioId,
        usuarioId
      ]
    );
    return { id };
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new Error('Codice utente o email già utilizzati');
    throw error;
  }
}

async function actualizarUsuario(conexion, id, registro, usuarioId) {
  const hash = registro.password ? await bcrypt.hash(registro.password, 12) : null;
  try {
    await conexion.execute(
      'UPDATE utenti SET fk_ruolo=?,codice_usuario=?,nome=?,email=?,password_hash=COALESCE(?,password_hash),stato=?,utente_modifica=? WHERE id=?',
      [
        await idRol(registro.ruolo, conexion),
        registro.codice_usuario,
        registro.nome,
        registro.email,
        hash,
        registro.stato,
        usuarioId,
        id
      ]
    );
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new Error('Codice utente o email già utilizzati');
    throw error;
  }
}

export async function sincronizarCaracteristicas(conexion, pezzoId, caracteristicas, usuarioId) {
  await conexion.execute('UPDATE pezzi_tipi_caratteristiche SET stato="inattivo",utente_modifica=? WHERE fk_pezzo=?', [
    usuarioId,
    pezzoId
  ]);
  for (const caracteristica of caracteristicas) {
    await conexion.execute(
      'INSERT INTO pezzi_tipi_caratteristiche (fk_pezzo,fk_tipo_caratteristica,quantita,stato,utente_crea,utente_modifica) VALUES (?,?,?,"attivo",?,?) ON DUPLICATE KEY UPDATE quantita=VALUES(quantita),stato="attivo",utente_modifica=VALUES(utente_modifica)',
      [pezzoId, caracteristica.tipoCaratteristicaId, caracteristica.quantita, usuarioId, usuarioId]
    );
  }
}

export async function crearRegistro(recurso, catalogo, registro, usuarioId) {
  if (recurso === 'clienti') {
    const creado = await crearCliente(pool, registro, usuarioId);
    return { id: creado.id, codice: creado.codice };
  }
  if (recurso === 'macchine') {
    const creado = await crearMaquina(pool, registro, usuarioId);
    return { id: creado.id };
  }
  if (recurso === 'utenti') {
    return crearUsuario(pool, registro, usuarioId);
  }

  const id = nuevoId();
  const columnas = ['id', ...catalogo.columnas, 'utente_crea', 'utente_modifica'];
  await pool.execute(
    `INSERT INTO ${catalogo.tabla} (${columnas.join(',')}) VALUES (${columnas.map(() => '?').join(',')})`,
    [id, ...catalogo.columnas.map((columna) => registro[columna]), usuarioId, usuarioId]
  );
  if (recurso === 'pezzi') {
    await sincronizarCaracteristicas(pool, id, registro.caratteristiche, usuarioId);
  }
  return { id };
}

export async function actualizarRegistro(recurso, catalogo, id, registro, usuarioId) {
  if (recurso === 'clienti') {
    await pool.execute(
      'UPDATE clienti SET fk_fornitore=?,tipo_cliente=?,codice=COALESCE(?,codice),nome=?,indirizzo=?,url_mappe=?,latitudine=?,longitudine=?,citta=?,stato=?,utente_modifica=? WHERE id=?',
      [
        registro.fk_fornitore,
        registro.tipo_cliente,
        registro.codice,
        registro.nome,
        registro.indirizzo,
        registro.url_mappe,
        registro.latitudine,
        registro.longitudine,
        registro.citta,
        registro.stato,
        usuarioId,
        id
      ]
    );
    return;
  }
  if (recurso === 'macchine') {
    await actualizarMaquina(pool, id, registro, usuarioId);
    return;
  }
  if (recurso === 'utenti') {
    await actualizarUsuario(pool, id, registro, usuarioId);
    return;
  }

  await pool.execute(
    `UPDATE ${catalogo.tabla} SET ${catalogo.columnas.map((columna) => `${columna}=?`).join(',')},utente_modifica=? WHERE id=?`,
    [...catalogo.columnas.map((columna) => registro[columna]), usuarioId, id]
  );
  if (recurso === 'pezzi') {
    await sincronizarCaracteristicas(pool, id, registro.caratteristiche, usuarioId);
  }
}

export async function desactivarRegistro(recurso, catalogo, id, usuarioId) {
  if (catalogo.protegido && String(id) === String(usuarioId)) {
    throw new Error('Non puoi disattivare il tuo stesso utente');
  }
  await pool.execute(`UPDATE ${catalogo.tabla} SET stato="inattivo",utente_modifica=? WHERE id=?`, [usuarioId, id]);
}
