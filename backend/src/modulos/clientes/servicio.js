import { z } from 'zod';
import { consultarUno } from '../../base-datos/pool.js';
import { nuevoId } from '../../utilidades/identificadores.js';
import { empresaActual } from '../../intermedios/contexto-empresa.js';

export const esquemaCliente = z.object({
  nome: z.string().trim().min(2).max(160),
  indirizzo: z.string().trim().min(3).max(255),
  citta: z.string().trim().min(2).max(120),
  tipo_cliente: z.enum(['privato', 'fornitore']).default('privato'),
  fk_fornitore: z.string().uuid().nullable().optional(),
  codice: z.string().trim().min(5).max(45).nullable().optional(),
  url_mappe: z.preprocess((valor) => (valor === '' ? null : valor), z.string().trim().url().max(500).nullable().optional()),
  latitudine: z.preprocess((valor) => (valor === '' ? null : valor), z.coerce.number().min(-90).max(90).nullable().optional()),
  longitudine: z.preprocess((valor) => (valor === '' ? null : valor), z.coerce.number().min(-180).max(180).nullable().optional()),
  stato: z.enum(['attivo', 'inattivo']).default('attivo')
});

/** Estrae le coordinate da un link Google Maps quando non sono inserite a mano. */
export function coordenadasDesdeMapa(url) {
  if (!url) return { latitudine: null, longitudine: null };
  const coincidencia =
    String(url).match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/) ||
    String(url).match(/[?&](?:query|q)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  return coincidencia
    ? { latitudine: Number(coincidencia[1]), longitudine: Number(coincidencia[2]) }
    : { latitudine: null, longitudine: null };
}

export function normalizarCliente(datos) {
  const cliente = esquemaCliente.parse(datos ?? {});
  const coordenadas = coordenadasDesdeMapa(cliente.url_mappe);
  return {
    ...cliente,
    codice: cliente.codice ? cliente.codice.toUpperCase() : null,
    url_mappe: cliente.url_mappe || null,
    latitudine: cliente.latitudine ?? coordenadas.latitudine,
    longitudine: cliente.longitudine ?? coordenadas.longitudine,
    fk_fornitore: cliente.tipo_cliente === 'fornitore' ? (cliente.fk_fornitore ?? null) : null
  };
}

async function prefijoCliente(cliente, conexion) {
  if (cliente.codice) return null;
  if (cliente.tipo_cliente === 'privato') return 'PRIV';
  if (!cliente.fk_fornitore) throw new Error('Seleziona un fornitore per il cliente collegato');
  const fornitore = await consultarUno('SELECT codice FROM fornitori WHERE id=? AND fk_azienda=? AND stato="attivo"', [cliente.fk_fornitore, empresaActual()], conexion);
  if (!fornitore) throw new Error('Fornitore non trovato');
  return fornitore.codice;
}

export async function siguienteCodigoCliente(cliente, conexion) {
  if (cliente.codice) return cliente.codice;
  const prefijo = await prefijoCliente(cliente, conexion);
  const fila = await consultarUno(
    'SELECT COALESCE(MAX(CAST(SUBSTRING(codice, ?) AS UNSIGNED)),0) ultimo FROM clienti WHERE fk_azienda=? AND codice LIKE ?',
    [prefijo.length + 2, empresaActual(), `${prefijo}-%`],
    conexion
  );
  return `${prefijo}-${String(Number(fila?.ultimo ?? 0) + 1).padStart(4, '0')}`;
}

/**
 * Crea el cliente generando su código dentro de la misma transacción. Si dos
 * peticiones calculan el mismo progresivo, el índice único rechaza el
 * duplicado y se reintenta con el siguiente número disponible.
 */
export async function crearCliente(conexion, datos, usuarioId, intentos = 5) {
  const cliente = normalizarCliente(datos);
  let ultimoError;

  for (let intento = 0; intento < intentos; intento += 1) {
    const codigo = await siguienteCodigoCliente(cliente, conexion);
    const id = nuevoId();
    try {
      await conexion.execute(
        'INSERT INTO clienti (id,fk_azienda,fk_fornitore,tipo_cliente,codice,nome,indirizzo,url_mappe,latitudine,longitudine,citta,stato,utente_crea,utente_modifica) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [
          id,
          empresaActual(),
          cliente.fk_fornitore,
          cliente.tipo_cliente,
          codigo,
          cliente.nome,
          cliente.indirizzo,
          cliente.url_mappe,
          cliente.latitudine,
          cliente.longitudine,
          cliente.citta,
          cliente.stato,
          usuarioId,
          usuarioId
        ]
      );
      return { id, codice: codigo };
    } catch (error) {
      if (error.code !== 'ER_DUP_ENTRY' || cliente.codice) throw error;
      ultimoError = error;
    }
  }

  throw ultimoError ?? new Error('Impossibile generare il codice cliente');
}
