import { consultar, consultarUno, ejecutar } from '../../base-datos/pool.js';
import { crearCliente } from '../clientes/servicio.js';
import { detectarCliente, mejorCoincidencia } from './ocr.js';

export const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export function analizarImagenEntrada({ immagine, tipoMime, nomeFile }) {
  if (!immagine || typeof immagine !== 'string') throw new Error('Carica la foto dello scontrino');

  const coincidencia = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(immagine.trim());
  const tipo = (coincidencia?.[1] ?? tipoMime ?? 'image/jpeg').toLowerCase();
  const base64 = (coincidencia?.[2] ?? immagine).replace(/\s+/g, '');

  if (!TIPOS_IMAGEN.includes(tipo)) throw new Error('Formato immagine non supportato');
  if (!/^[A-Za-z0-9+/=]+$/.test(base64)) throw new Error('Immagine non valida');

  const bytes = Math.floor((base64.length * 3) / 4);
  if (bytes > 8 * 1024 * 1024) throw new Error('La foto supera gli 8 MB consentiti');

  return { tipoMime: tipo, base64, bytes, nomeFile: (nomeFile || 'scontrino.jpg').slice(0, 190) };
}

async function buscarClienteSugerido(nombre) {
  if (!nombre) return null;
  const clientes = await consultar('SELECT id,codice,nome,citta,indirizzo FROM clienti WHERE stato="attivo"');
  return mejorCoincidencia(nombre, clientes);
}

export async function analizarScontrino({ imagen, usuarioId, clienteId = null }) {
  const { tipoMime, base64, bytes, nombreFile } = normalizarEntrada(imagen);
  const buffer = Buffer.from(base64, 'base64');

  let analisis = { proveedor: 'conferma_manuale', nome: null, messaggio: null };
  let errorAnalisis = null;
  try {
    analisis = await detectarCliente({ imagenBase64: base64, tipoMime, nombreArchivo: nombreFile, buffer });
  } catch (error) {
    errorAnalisis = error.message;
    analisis = { proveedor: 'errore', nome: null, messaggio: error.message };
  }

  const sugerido = await buscarClienteSugerido(analisis.nome);
  const resultado = await ejecutar(
    'INSERT INTO scontrini (fk_cliente,fk_tecnico,nome_file,tipo_mime,dimensione,immagine,testo_estratto,nome_rilevato,indirizzo_rilevato,citta_rilevata,confidenza,fornitore_analisi,messaggio_analisi,stato_analisi,utente_crea,utente_modifica) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [
      clienteId ?? sugerido?.id ?? null,
      usuarioId,
      normalizarNombreArchivo(nombreFile),
      tipoMime,
      bytes,
      buffer,
      analisis.testo ?? null,
      analisis.nome ?? null,
      analisis.indirizzo ?? null,
      analisis.citta ?? null,
      analisis.confidenza ?? null,
      analisis.proveedor ?? null,
      analisis.messaggio ?? errorAnalisis ?? null,
      clienteId || sugerido ? 'collegato' : analisis.nome ? 'analizzato' : 'in_attesa',
      usuarioId,
      usuarioId
    ]
  );

  return {
    id: resultado.insertId,
    analisi: {
      nome: analisis.nome ?? null,
      indirizzo: analisis.indirizzo ?? null,
      citta: analisis.citta ?? null,
      confidenza: analisis.confidenza ?? null,
      proveedor: analisis.proveedor ?? null,
      messaggio: analisis.messaggio ?? errorAnalisis ?? null
    },
    cliente: sugerido
      ? { id: sugerido.id, codice: sugerido.codice, nome: sugerido.nome, indirizzo: sugerido.indirizzo, citta: sugerido.citta, similitudine: sugerido.puntuacion }
      : null
  };
}

function normalizarEntrada(imagen) {
  const entrada = typeof imagen === 'string' ? { immagine: imagen } : imagen;
  const { tipoMime, base64, bytes, nomeFile } = analizarImagenEntrada(entrada);
  return { tipoMime, base64, bytes, nombreFile: normalizarNombreArchivo(nomeFile) };
}

export function normalizarNombreArchivo(nombre) {
  const limpio = String(nombre ?? 'scontrino.jpg').replace(/[^\w.\-]+/g, '_');
  return (limpio || 'scontrino.jpg').slice(0, 190);
}

export async function obtenerScontrino(id) {
  return consultarUno(
    'SELECT s.id,s.fk_cliente,s.nome_file,s.tipo_mime,s.dimensione,s.nome_rilevato,s.indirizzo_rilevato,s.citta_rilevata,s.confidenza,s.fornitore_analisi,s.messaggio_analisi,s.stato_analisi,s.creato_at,c.nome cliente FROM scontrini s LEFT JOIN clienti c ON c.id=s.fk_cliente WHERE s.id=? AND s.stato="attivo"',
    [Number(id)]
  );
}

/** Un técnico solo accede a los scontrinos que él mismo subió. */
export async function puedeAccederScontrino(usuario, id) {
  if (usuario.ruolo !== 'tecnico') return true;
  const fila = await consultarUno('SELECT id FROM scontrini WHERE id=? AND fk_tecnico=? AND stato="attivo"', [
    Number(id),
    usuario.sub
  ]);
  return Boolean(fila);
}

export async function obtenerImagenScontrino(id, usuario) {
  if (usuario && !(await puedeAccederScontrino(usuario, id))) return null;
  return consultarUno('SELECT tipo_mime,immagine FROM scontrini WHERE id=? AND stato="attivo"', [Number(id)]);
}

/**
 * Crea (o reutiliza) el cliente a partir de los datos de la foto y lo vincula
 * al scontrino. Si el nombre ya existe se devuelve el cliente existente para
 * no duplicar el maestro.
 */
export async function crearClienteDesdeScontrino(conexion, id, datos, usuarioId) {
  const scontrino = await consultarUno('SELECT id,fk_cliente,nome_rilevato,indirizzo_rilevato,citta_rilevata FROM scontrini WHERE id=? AND stato="attivo"', [Number(id)], conexion);
  if (!scontrino) throw new Error('Scontrino non trovato');

  if (scontrino.fk_cliente && !datos.nome) {
    const existente = await consultarUno('SELECT id,codice,nome,indirizzo,citta FROM clienti WHERE id=?', [scontrino.fk_cliente], conexion);
    return { cliente: existente, creado: false };
  }

  const nome = (datos.nome || scontrino.nome_rilevato || '').trim();
  if (nome.length < 2) throw new Error('Indica il nome del cliente');

  const candidatos = await consultar('SELECT id,codice,nome,indirizzo,citta FROM clienti WHERE stato="attivo"', [], conexion);
  const coincidencia = mejorCoincidencia(nome, candidatos);
  let cliente = coincidencia ? { id: coincidencia.id, codice: coincidencia.codice, nome: coincidencia.nome, indirizzo: coincidencia.indirizzo, citta: coincidencia.citta } : null;
  let creado = false;

  if (!cliente) {
    const creadoResultado = await crearCliente(
      conexion,
      {
        nome,
        indirizzo: datos.indirizzo || scontrino.indirizzo_rilevato || 'Da completare',
        citta: datos.citta || scontrino.citta_rilevata || 'Da completare',
        tipo_cliente: datos.tipo_cliente ?? 'privato',
        fk_fornitore: datos.fk_fornitore ?? null
      },
      usuarioId
    );
    cliente = { id: creadoResultado.id, codice: creadoResultado.codice, nome, indirizzo: datos.indirizzo || scontrino.indirizzo_rilevato || 'Da completare', citta: datos.citta || scontrino.citta_rilevata || 'Da completare' };
    creado = true;
  }

  await conexion.execute('UPDATE scontrini SET fk_cliente=?,stato_analisi="collegato",utente_modifica=? WHERE id=?', [
    cliente.id,
    usuarioId,
    Number(id)
  ]);

  return { cliente, creado };
}
