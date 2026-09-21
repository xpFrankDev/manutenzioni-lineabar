import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createWorker } from 'tesseract.js';
import { entorno } from '../../configuracion/entorno.js';

const INSTRUCCION_IA =
  'Sei un assistente per un tecnico di manutenzione italiano. Analizza la foto di uno scontrino, una ricevuta o una fattura. ' +
  'Individua il nome del CLIENTE (l\'attività che ha ricevuto il servizio: bar, ristorante, hotel), non del fornitore o del rivenditore. ' +
  'Rispondi soltanto con un oggetto JSON valido con questa forma: ' +
  '{"nome":"nome attività","indirizzo":"via e civico o null","citta":"città o null","confidenza":0.0,"testo":"testo leggibile utile"}';

/** Palabras que suelen acompañar al nombre de un local en un scontrino. */
const PALABRAS_NEGOCIO = [
  /\bbar\b/i,
  /caff[eè]/i,
  /ristorante/i,
  /pizzeri/i,
  /trattori/i,
  /osteri/i,
  /hotel/i,
  /albergo/i,
  /gelateri/i,
  /pasticceri/i,
  /panifici/i,
  /\bforno\b/i,
  /enotec/i,
  /bistrot/i,
  /snack/i,
  /circolo/i,
  /\bpub\b/i,
  /cremeri/i,
  /gastronomi/i,
  /mace(ll|I)eri/i,
  /pescheri/i,
  /tabacchi/i,
  /farmaci/i,
  /self\s?service/i,
  /\bs\.?r\.?l\.?\b/i,
  /\bs\.?n\.?c\.?\b/i,
  /\bs\.?a\.?s\.?\b/i,
  /\bditta\b/i,
  /\bazienda\b/i
];

/** Líneas que nunca son el nombre del cliente. */
const LINEAS_DESCARTADAS =
  /(p\.?\s?iva|partita\s+iva|\bvat\b|cod(ice)?\.?\s*fisc|iban|tel\.?|telefono|fax|cell|e-?mail|www\.|@|totale|subtotale|sconto|\biva\b|cassa|resto|contante|pagamento|bancomat|carta|scontrino|ricevuta|fattura|documento|commerciale|\bdata\b|\bora\b|operatore|cassiere|tavolo|coperti|grazie|buon\s+appetito|prezzo|articolo|quantit|q\.?t|nr\.?|numero\s+documento|divisa|importo|sconto|omaggio|servizio\s+ai\s+tavoli)/i;

export function limpiarNombre(valor) {
  if (!valor || typeof valor !== 'string') return null;
  let limpio = valor.replace(/\s+/g, ' ').trim();
  // Quita comillas y espacios repetidos en los extremos.
  for (let vuelta = 0; vuelta < 3; vuelta += 1) {
    limpio = limpio.replace(/^[\s"'«»]+|[\s"'«»]+$/g, '');
  }
  return limpio ? limpio.slice(0, 160) : null;
}

export function normalizarNombre(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function bigramas(texto) {
  const limpio = normalizarNombre(texto).replace(/ /g, '');
  const conjunto = new Map();
  for (let indice = 0; indice < limpio.length - 1; indice += 1) {
    const par = limpio.slice(indice, indice + 2);
    conjunto.set(par, (conjunto.get(par) ?? 0) + 1);
  }
  return conjunto;
}

/** Similitud Dice entre dos nombres comerciales (0 a 1). */
export function similitud(a, b) {
  const normalA = normalizarNombre(a);
  const normalB = normalizarNombre(b);
  if (!normalA || !normalB) return 0;
  if (normalA === normalB) return 1;
  if (normalA.includes(normalB) || normalB.includes(normalA)) return 0.9;

  const paresA = bigramas(normalA);
  const paresB = bigramas(normalB);
  let comunes = 0;
  let totalA = 0;
  let totalB = 0;
  for (const [par, cantidad] of paresA) {
    totalA += cantidad;
    comunes += Math.min(cantidad, paresB.get(par) ?? 0);
  }
  for (const cantidad of paresB.values()) totalB += cantidad;
  return (2 * comunes) / (totalA + totalB || 1);
}

export function mejorCoincidencia(nombre, clientes) {
  let mejor = null;
  for (const cliente of clientes) {
    const puntuacion = Math.max(similitud(nombre, cliente.nome), similitud(nombre, `${cliente.nome} ${cliente.citta}`));
    if (!mejor || puntuacion > mejor.puntuacion) mejor = { ...cliente, puntuacion };
  }
  return mejor && mejor.puntuacion >= 0.72 ? mejor : null;
}

/**
 * Elige el nombre del cliente a partir del texto que devuelve el OCR. Los
 * scontrinos italianos empiezan por la razón social, así que se puntúan las
 * primeras líneas y las que contienen palabras de negocio.
 */
export function extraerNombreCliente(texto) {
  const lineas = String(texto ?? '')
    .split('\n')
    .map((linea) => limpiarNombre(linea.replace(/[|_]+/g, ' ')))
    .filter(Boolean);

  let mejor = null;
  lineas.forEach((linea, indice) => {
    if (linea.length < 4 || linea.length > 70) return;
    const letras = (linea.match(/[a-zàèéìòù]/gi) ?? []).length;
    if (letras < 3) return;

    let puntuacion = 0;
    if (indice === 0) puntuacion += 2.5;
    else if (indice < 4) puntuacion += 1.5;
    else if (indice < 8) puntuacion += 0.5;
    if (PALABRAS_NEGOCIO.some((patron) => patron.test(linea))) puntuacion += 3;
    if (linea === linea.toUpperCase()) puntuacion += 0.8;
    if (/\d/.test(linea)) puntuacion -= 1.2;
    if (LINEAS_DESCARTADAS.test(linea)) puntuacion -= 6;

    if (!mejor || puntuacion > mejor.puntuacion) mejor = { nome: linea, puntuacion, indice };
  });

  if (!mejor || mejor.puntuacion < 1.5) return { nome: null, confidenza: 0.2 };
  // 3 puntos ya indican una línea del encabezado con palabra de negocio.
  const confidenza = Math.max(0.35, Math.min(0.9, 0.35 + mejor.puntuacion / 8));
  return { nome: mejor.nome, confidenza: Number(confidenza.toFixed(2)) };
}

/* ------------------------------------------------------------------ *
 * OCR local y gratuito con Tesseract (tesseract.js + datos de idioma) *
 * ------------------------------------------------------------------ */

let trabajador = null;
let cola = Promise.resolve();
let directorioIdiomas = null;

async function prepararIdiomas() {
  const idiomas = String(entorno.ocr.idiomas || 'ita')
    .split(',')
    .map((idioma) => idioma.trim().toLowerCase())
    .filter(Boolean);
  if (!idiomas.length) return { idiomas: ['ita'], langPath: undefined };

  const destino = path.join(os.tmpdir(), 'lineabar-tesseract');
  await mkdir(destino, { recursive: true });
  for (const idioma of idiomas) {
    const origen = path.join(
      process.cwd(),
      'node_modules',
      `@tesseract.js-data/${idioma}`,
      '4.0.0_best_int',
      `${idioma}.traineddata.gz`
    );
    await copyFile(origen, path.join(destino, `${idioma}.traineddata.gz`));
    // tesseract.js busca esta lista opcional y avisa si falta: se deja vacía.
    await writeFile(path.join(destino, `${idioma}.special-words`), '');
  }
  return { idiomas, langPath: destino };
}

async function obtenerTrabajador() {
  if (trabajador) return trabajador;
  if (!directorioIdiomas) directorioIdiomas = await prepararIdiomas();
  trabajador = await createWorker(directorioIdiomas.idiomas, 1, {
    langPath: directorioIdiomas.langPath,
    cachePath: path.join(os.tmpdir(), 'lineabar-tesseract-cache'),
    gzip: true
  });
  return trabajador;
}

export async function detectarConTesseract(imagen) {
  const reconocer = async () => {
    const worker = await obtenerTrabajador();
    const { data } = await worker.recognize(imagen);
    const texto = String(data?.text ?? '');
    const { nome, confidenza } = extraerNombreCliente(texto);
    return {
      proveedor: 'tesseract',
      nome,
      indirizzo: null,
      citta: null,
      confidenza,
      testo: texto.slice(0, 4000),
      messaggio: nome ? null : 'Nome cliente non riconosciuto: confermalo o scrivilo a mano.'
    };
  };

  const conTiempoLimite = Promise.race([
    // La cola evita que dos análisis simultáneos saturen la CPU del servidor.
    cola.then(reconocer),
    new Promise((_, rechazar) => setTimeout(() => rechazar(new Error('Analisi OCR troppo lenta')), entorno.ocr.tiempoLimiteMs))
  ]);

  cola = conTiempoLimite.catch(() => {});
  try {
    return await conTiempoLimite;
  } catch (error) {
    // Un fallo del trabajador no debe envenenar la cola: se recrea la próxima vez.
    trabajador = null;
    throw error;
  }
}

/* ------------------------------------------------------------------ *
 * Proveedor opcional compatible con la API de chat de OpenAI          *
 * ------------------------------------------------------------------ */

function interpretarRespuesta(contenido) {
  const texto = String(contenido ?? '').trim();
  const inicio = texto.indexOf('{');
  const fin = texto.lastIndexOf('}');
  if (inicio === -1 || fin <= inicio) throw new Error('Risposta OCR senza JSON');
  const datos = JSON.parse(texto.slice(inicio, fin + 1));
  const confianza = Number(datos.confidenza);
  return {
    nome: limpiarNombre(datos.nome),
    indirizzo: limpiarNombre(datos.indirizzo),
    citta: limpiarNombre(datos.citta),
    testo: typeof datos.testo === 'string' ? datos.testo.slice(0, 4000) : null,
    confidenza: Number.isFinite(confianza) ? Math.max(0, Math.min(1, confianza)) : null
  };
}

export async function detectarConOpenAI({ imagenBase64, tipoMime, nombreArchivo }) {
  const respuesta = await fetch(entorno.ocr.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${entorno.ocr.apiKey}`
    },
    body: JSON.stringify({
      model: entorno.ocr.modelo,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: INSTRUCCION_IA },
        {
          role: 'user',
          content: [
            { type: 'text', text: `File: ${nombreArchivo ?? 'scontrino'}. Estrai il nome del cliente.` },
            { type: 'image_url', image_url: { url: `data:${tipoMime};base64,${imagenBase64}` } }
          ]
        }
      ]
    }),
    signal: AbortSignal.timeout(entorno.ocr.tiempoLimiteMs)
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => '');
    throw new Error(`Servizio OCR non disponibile (${respuesta.status})${detalle ? `: ${detalle.slice(0, 160)}` : ''}`);
  }

  const cuerpo = await respuesta.json();
  const analisis = interpretarRespuesta(cuerpo?.choices?.[0]?.message?.content);
  return { proveedor: 'openai', ...analisis, messaggio: analisis.nome ? null : 'Nessun nome cliente riconosciuto nella foto.' };
}

/**
 * Detección del nombre del cliente a partir de la foto del scontrino.
 * Por defecto usa Tesseract en el propio servidor (gratuito y sin depender de
 * servicios externos). `LINEABAR_OCR_PROVEEDOR=openai` habilita un servicio
 * multimodal si algún día conviene; `ninguno` deja solo la confirmación manual.
 */
export async function detectarCliente({ imagenBase64, tipoMime, nombreArchivo, buffer }) {
  const proveedor = entorno.ocr.proveedor;

  if (proveedor === 'openai' && entorno.ocr.endpoint && entorno.ocr.apiKey) {
    return detectarConOpenAI({ imagenBase64, tipoMime, nombreArchivo });
  }

  if (proveedor === 'ninguno') {
    return {
      proveedor: 'conferma_manuale',
      nome: null,
      indirizzo: null,
      citta: null,
      confidenza: null,
      testo: null,
      messaggio: 'Analisi automatica disattivata: conferma o scrivi il nome del cliente.'
    };
  }

  try {
    return await detectarConTesseract(buffer ?? Buffer.from(imagenBase64, 'base64'));
  } catch (error) {
    return {
      proveedor: 'tesseract',
      nome: null,
      indirizzo: null,
      citta: null,
      confidenza: null,
      testo: null,
      messaggio: `Analisi locale non riuscita (${error.message}). Conferma o scrivi il nome del cliente.`
    };
  }
}
