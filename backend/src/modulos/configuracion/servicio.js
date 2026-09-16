import { z } from 'zod';
import { consultarUno, pool } from '../../base-datos/pool.js';

export const TIPOS_MAQUINA = ['macchina_caffe', 'produttore_ghiaccio', 'lavastoviglie', 'filtro', 'addolcitore'];

const tablaPorRecurso = {
  fornitori: 'fornitori',
  clienti: 'clienti',
  macchine: 'macchine',
  pezzi: 'pezzi',
  caratteristiche: 'tipi_caratteristiche'
};

export const catalogoConfigurable = {
  fornitori: {
    tabla: tablaPorRecurso.fornitori,
    columnas: ['codice', 'nome', 'stato'],
    listado: 'SELECT id,codice,nome,stato FROM fornitori ORDER BY stato DESC,nome',
    validar: (datos) => ({
      codice: z.string().trim().min(2).max(30).parse(datos.codice).toUpperCase(),
      nome: z.string().trim().min(2).max(120).parse(datos.nome),
      stato: datos.stato === 'inattivo' ? 'inattivo' : 'attivo'
    })
  },
  clienti: {
    tabla: tablaPorRecurso.clienti,
    columnas: ['fk_fornitore', 'tipo_cliente', 'codice', 'nome', 'indirizzo', 'citta', 'stato'],
    listado:
      'SELECT c.id,c.codice,c.nome,c.tipo_cliente,c.indirizzo,c.citta,c.fk_fornitore,c.stato,f.nome fornitore FROM clienti c LEFT JOIN fornitori f ON f.id=c.fk_fornitore ORDER BY c.stato DESC,c.nome',
    validar: (datos) => ({
      fk_fornitore: datos.fk_fornitore ? z.coerce.number().int().positive().parse(datos.fk_fornitore) : null,
      tipo_cliente: datos.tipo_cliente === 'fornitore' ? 'fornitore' : 'privato',
      codice: datos.codice ? z.string().trim().min(5).max(45).parse(datos.codice).toUpperCase() : null,
      nome: z.string().trim().min(2).max(160).parse(datos.nome),
      indirizzo: z.string().trim().min(3).max(255).parse(datos.indirizzo),
      citta: z.string().trim().min(2).max(120).parse(datos.citta),
      stato: datos.stato === 'inattivo' ? 'inattivo' : 'attivo'
    })
  },
  macchine: {
    tabla: tablaPorRecurso.macchine,
    columnas: ['fk_cliente', 'fk_fornitore', 'codice_unico', 'tipo_macchina', 'modello', 'stato'],
    listado:
      'SELECT m.id,m.codice_unico,m.tipo_macchina,m.modello,m.fk_cliente,m.fk_fornitore,m.stato,c.nome cliente,c.indirizzo,COALESCE(f.nome,ma.nome) fornitore FROM macchine m JOIN clienti c ON c.id=m.fk_cliente LEFT JOIN fornitori f ON f.id=m.fk_fornitore LEFT JOIN marche ma ON ma.id=m.fk_marca ORDER BY m.stato DESC,c.nome,m.modello',
    validar: (datos) => ({
      fk_cliente: z.coerce.number().int().positive().parse(datos.fk_cliente),
      fk_fornitore: datos.fk_fornitore ? z.coerce.number().int().positive().parse(datos.fk_fornitore) : null,
      codice_unico: z.string().trim().min(4).max(50).parse(datos.codice_unico).toUpperCase(),
      tipo_macchina: z.enum(TIPOS_MAQUINA).parse(datos.tipo_macchina),
      modello: z.string().trim().max(100).optional().parse(datos.modello || '') || null,
      stato: datos.stato === 'inattivo' ? 'inattivo' : 'attivo'
    })
  },
  pezzi: {
    tabla: tablaPorRecurso.pezzi,
    columnas: ['nome', 'codice_unico', 'tipo_macchina', 'prezzo', 'intervallo_mesi', 'stato'],
    listado:
      'SELECT p.id,p.nome,p.codice_unico,p.tipo_macchina,CAST(p.prezzo AS DECIMAL(10,2)) prezzo,p.intervallo_mesi,p.stato,ma.nome fornitore FROM pezzi p LEFT JOIN marche ma ON ma.id=p.fk_marca ORDER BY p.stato DESC,p.nome',
    validar: (datos) => ({
      nome: z.string().trim().min(2).max(150).parse(datos.nome),
      codice_unico: z.string().trim().min(4).max(60).parse(datos.codice_unico).toUpperCase(),
      tipo_macchina: z.enum(TIPOS_MAQUINA).parse(datos.tipo_macchina),
      prezzo: z.coerce.number().min(0).max(99999).parse(datos.prezzo),
      intervallo_mesi:
        datos.intervallo_mesi === '' || datos.intervallo_mesi == null
          ? null
          : z.coerce.number().int().min(1).max(120).parse(datos.intervallo_mesi),
      stato: datos.stato === 'inattivo' ? 'inattivo' : 'attivo'
    })
  },
  caratteristiche: {
    tabla: tablaPorRecurso.caratteristiche,
    columnas: ['codice_unico', 'nome', 'unita_misura', 'stato'],
    listado: 'SELECT id,codice_unico,nome,unita_misura,stato FROM tipi_caratteristiche ORDER BY stato DESC,nome',
    validar: (datos) => ({
      codice_unico: z.string().trim().min(2).max(50).parse(datos.codice_unico).toUpperCase(),
      nome: z.string().trim().min(2).max(120).parse(datos.nome),
      unita_misura: z.string().trim().max(30).optional().parse(datos.unita_misura || '') || null,
      stato: datos.stato === 'inattivo' ? 'inattivo' : 'attivo'
    })
  }
};

export function obtenerCatalogo(recurso) {
  return catalogoConfigurable[recurso] ?? null;
}

async function codigoCliente(datos) {
  if (datos.codice) return datos.codice;
  const prefijo =
    datos.tipo_cliente === 'privato'
      ? 'PRIV'
      : (await consultarUno('SELECT codice FROM fornitori WHERE id=?', [datos.fk_fornitore]))?.codice;
  if (!prefijo) throw new Error('Seleziona un fornitore per il cliente collegato');

  const fila = await consultarUno('SELECT COUNT(*) totale FROM clienti WHERE codice LIKE ?', [`${prefijo}-%`]);
  return `${prefijo}-${String(Number(fila.totale) + 1).padStart(4, '0')}`;
}

async function idMarcaPorProveedor(idFornecedor) {
  if (!idFornecedor) return 1;
  const fornecedor = await consultarUno('SELECT nome FROM fornitori WHERE id=?', [idFornecedor]);
  if (!fornecedor) throw new Error('Fornitore non trovato');

  await pool.execute('INSERT IGNORE INTO marche (nome) VALUES (?)', [fornecedor.nome]);
  const marca = await consultarUno('SELECT id FROM marche WHERE nome=?', [fornecedor.nome]);
  return marca.id;
}

export async function prepararRegistro(recurso, catalogo, datos) {
  const registro = catalogo.validar(datos);
  if (recurso === 'clienti') registro.codice = await codigoCliente(registro);
  return registro;
}

export async function crearRegistro(recurso, catalogo, registro, usuarioId) {
  if (recurso === 'macchine') {
    const marca = await idMarcaPorProveedor(registro.fk_fornitore);
    const [maquina] = await pool.execute(
      'INSERT INTO macchine (fk_cliente,fk_marca,fk_fornitore,codice_unico,tipo_macchina,modello,utente_crea,utente_modifica,stato) VALUES (?,?,?,?,?,?,?,?,?)',
      [
        registro.fk_cliente,
        marca,
        registro.fk_fornitore,
        registro.codice_unico,
        registro.tipo_macchina,
        registro.modello,
        usuarioId,
        usuarioId,
        registro.stato
      ]
    );
    return maquina.insertId;
  }

  const columnas = [...catalogo.columnas, 'utente_crea', 'utente_modifica'];
  const [registroCreado] = await pool.execute(
    `INSERT INTO ${catalogo.tabla} (${columnas.join(',')}) VALUES (${columnas.map(() => '?').join(',')})`,
    [...catalogo.columnas.map((columna) => registro[columna]), usuarioId, usuarioId]
  );
  return registroCreado.insertId;
}

export async function actualizarRegistro(recurso, catalogo, id, registro, usuarioId) {
  if (recurso === 'macchine') {
    const marca = await idMarcaPorProveedor(registro.fk_fornitore);
    await pool.execute(
      'UPDATE macchine SET fk_cliente=?,fk_marca=?,fk_fornitore=?,codice_unico=?,tipo_macchina=?,modello=?,utente_modifica=?,stato=? WHERE id=?',
      [
        registro.fk_cliente,
        marca,
        registro.fk_fornitore,
        registro.codice_unico,
        registro.tipo_macchina,
        registro.modello,
        usuarioId,
        registro.stato,
        id
      ]
    );
    return;
  }

  await pool.execute(
    `UPDATE ${catalogo.tabla} SET ${catalogo.columnas.map((columna) => `${columna}=?`).join(',')},utente_modifica=? WHERE id=?`,
    [...catalogo.columnas.map((columna) => registro[columna]), usuarioId, id]
  );
}

export async function desactivarRegistro(catalogo, id, usuarioId) {
  await pool.execute(`UPDATE ${catalogo.tabla} SET stato="inattivo",utente_modifica=? WHERE id=?`, [usuarioId, Number(id)]);
}
