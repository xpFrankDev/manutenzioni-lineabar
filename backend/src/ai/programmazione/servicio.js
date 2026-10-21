import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const directorio = path.dirname(fileURLToPath(import.meta.url));
let instruccionesCache = null;

const esquemaTappa = z.object({
  attivitaId: z.string().uuid(),
  ordine: z.coerce.number().int().positive(),
  minutiDaPrecedente: z.coerce.number().int().min(0).max(240)
});

const esquemaRespuesta = z.object({
  tappe: z.array(esquemaTappa).max(20),
  riepilogo: z.string().trim().max(1500).optional().default('')
});

async function instrucciones() {
  if (!instruccionesCache) {
    instruccionesCache = await readFile(path.join(directorio, 'instrucciones.md'), 'utf8');
  }
  return instruccionesCache;
}

function endpointConfigurado() {
  return {
    endpoint: process.env.LINEABAR_AI_ENDPOINT || '',
    apiKey: process.env.LINEABAR_AI_API_KEY || '',
    modelo: process.env.LINEABAR_AI_MODELO || 'deepseek-v4.1-flash',
    tiempoLimiteMs: Number(process.env.LINEABAR_AI_TIEMPO_LIMITE_MS || 45000)
  };
}

/**
 * Llama a un endpoint compatible con Chat Completions. La clave se lee solo del
 * entorno del servidor y nunca se registra ni se devuelve al cliente.
 */
export async function generarProgramaConIa(entrada) {
  const configuracion = endpointConfigurado();
  if (!configuracion.endpoint || !configuracion.apiKey) return null;

  const respuesta = await fetch(configuracion.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${configuracion.apiKey}`
    },
    body: JSON.stringify({
      model: configuracion.modelo,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: await instrucciones() },
        { role: 'user', content: JSON.stringify(entrada) }
      ]
    }),
    signal: AbortSignal.timeout(configuracion.tiempoLimiteMs)
  });

  if (!respuesta.ok) {
    throw new Error(`Programmazione IA non disponibile (${respuesta.status})`);
  }

  const cuerpo = await respuesta.json();
  const contenido = cuerpo?.choices?.[0]?.message?.content;
  if (!contenido) throw new Error('La IA non ha restituito una risposta');

  const analisis = esquemaRespuesta.parse(JSON.parse(contenido));
  const ids = new Set(entrada.candidatos.map((fila) => fila.attivitaId));
  for (const tappa of analisis.tappe) {
    if (!ids.has(tappa.attivitaId)) throw new Error('La IA ha restituito un’attività non valida');
  }

  return {
    ...analisis,
    tappe: analisis.tappe
      .sort((a, b) => a.ordine - b.ordine)
      .slice(0, entrada.maxTappe)
      .map((tappa, indice) => ({ ...tappa, ordine: indice + 1 }))
  };
}
