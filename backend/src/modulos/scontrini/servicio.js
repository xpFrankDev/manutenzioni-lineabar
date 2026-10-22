import { consultar, consultarUno, ejecutar } from '../../base-datos/pool.js';
import { nuevoId } from '../../utilidades/identificadores.js';
import { analizarImagenEntrada, normalizarNombreArchivo } from '../../utilidades/imagenes.js';
import { crearCliente } from '../clientes/servicio.js';
import { detectarCliente, mejorCoincidencia } from './ocr.js';
import { empresaActual } from '../../intermedios/contexto-empresa.js';

async function buscarClienteSugerido(nombre) {
  if (!nombre) return null;
  const clientes = await consultar('SELECT id,codice,nome,citta,indirizzo FROM clienti WHERE stato="attivo" AND fk_azienda=?',
    [empresaActual()]);
  return mejorCoincidencia(nombre, clientes);
}

export async function analizarScontrino({ imagen, usuarioId, clienteId = null }) {
  if (clienteId) {
    const cliente = await consultarUno('SELECT id FROM clienti WHERE id=? AND fk_azienda=? AND stato="attivo"', [clienteId, empresaActual()]);
    if (!cliente) throw new Error('Cliente non disponibile');
  }
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
  const id = nuevoId();
  await ejecutar(
    'INSERT INTO scontrini (id,fk_azienda,fk_cliente,fk_tecnico,nome_file,tipo_mime,dimensione,immagine,testo_estratto,nome_rilevato,indirizzo_rilevato,citta_rilevata,confidenza,fornitore_analisi,messaggio_analisi,stato_analisi,utente_crea,utente_modifica) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [
      id,
      empresaActual(),
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
    id,
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

export async function obtenerScontrino(id) {
  return consultarUno(
    'SELECT s.id,s.fk_cliente,s.nome_file,s.tipo_mime,s.dimensione,s.nome_rilevato,s.indirizzo_rilevato,s.citta_rilevata,s.confidenza,s.fornitore_analisi,s.messaggio_analisi,s.stato_analisi,s.creato_at,c.nome cliente FROM scontrini s LEFT JOIN clienti c ON c.id=s.fk_cliente WHERE s.id=? AND s.fk_azienda=? AND s.stato="attivo"',
    [id, empresaActual()]
  );
}

/** Un técnico solo accede a los scontrinos que él mismo subió. */
export async function puedeAccederScontrino(usuario, id) {
  const scontrino = await consultarUno('SELECT id,fk_tecnico FROM scontrini WHERE id=? AND fk_azienda=? AND stato="attivo"', [id, empresaActual()]);
  if (!scontrino) return false;
  if (usuario.ruolo !== 'tecnico') return true;
  return String(scontrino.fk_tecnico) === String(usuario.sub);
}

export async function obtenerImagenScontrino(id, usuario) {
  if (usuario && !(await puedeAccederScontrino(usuario, id))) return null;
  return consultarUno('SELECT tipo_mime,immagine FROM scontrini WHERE id=? AND fk_azienda=? AND stato="attivo"', [id, empresaActual()]);
}

/**
 * Crea (o reutiliza) el cliente a partir de los datos de la foto y lo vincula
 * al scontrino. Si el nombre ya existe se devuelve el cliente existente para
 * no duplicar el maestro.
 */
export async function crearClienteDesdeScontrino(conexion, id, datos, usuarioId) {
  const scontrino = await consultarUno('SELECT id,fk_cliente,nome_rilevato,indirizzo_rilevato,citta_rilevata FROM scontrini WHERE id=? AND fk_azienda=? AND stato="attivo"', [id, empresaActual()], conexion);
  if (!scontrino) throw new Error('Scontrino non trovato');

  if (scontrino.fk_cliente && !datos.nome) {
    const existente = await consultarUno('SELECT id,codice,nome,indirizzo,citta FROM clienti WHERE id=? AND fk_azienda=?', [scontrino.fk_cliente, empresaActual()], conexion);
    return { cliente: existente, creado: false };
  }

  const nome = (datos.nome || scontrino.nome_rilevato || '').trim();
  if (nome.length < 2) throw new Error('Indica il nome del cliente');

  const candidatos = await consultar('SELECT id,codice,nome,indirizzo,citta FROM clienti WHERE stato="attivo" AND fk_azienda=?',
    [empresaActual()], conexion);
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

  await conexion.execute('UPDATE scontrini SET fk_cliente=?,stato_analisi="collegato",utente_modifica=? WHERE id=? AND fk_azienda=?', [
    cliente.id,
    usuarioId,
    id,
    empresaActual()
  ]);

  return { cliente, creado };
}
