import { z } from 'zod';
import { consultarUno, pool } from '../../base-datos/pool.js';
import { empresaActual } from '../../intermedios/contexto-empresa.js';

export const esquemaEmpresa = z.object({
  nome: z.string().trim().min(2).max(160),
  logo_url: z.preprocess((valor) => (valor === '' ? null : valor), z.string().trim().max(1000).nullable().optional()),
  indirizzo: z.string().trim().max(255).nullable().optional(),
  citta: z.string().trim().max(120).nullable().optional(),
  latitudine: z.preprocess((valor) => (valor === '' ? null : valor), z.coerce.number().min(-90).max(90).nullable().optional()),
  longitudine: z.preprocess((valor) => (valor === '' ? null : valor), z.coerce.number().min(-180).max(180).nullable().optional()),
  ora_partenza: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).default('08:00:00'),
  email: z.preprocess((valor) => (valor === '' ? null : valor), z.string().trim().email().max(190).nullable().optional()),
  telefono: z.string().trim().max(40).nullable().optional(),
  sito_url: z.preprocess((valor) => (valor === '' ? null : valor), z.string().trim().url().max(500).nullable().optional())
});

export async function obtenerEmpresa() {
  return consultarUno(
    'SELECT id,codice,nome,logo_url,indirizzo,citta,latitudine,longitudine,ora_partenza,email,telefono,sito_url,stato FROM aziende WHERE id=? AND stato="attivo"',
    [empresaActual()]
  );
}

export async function actualizarEmpresa(datos, usuarioId) {
  const empresa = esquemaEmpresa.parse(datos ?? {});
  await pool.execute(
    'UPDATE aziende SET nome=?,logo_url=?,indirizzo=?,citta=?,latitudine=?,longitudine=?,ora_partenza=?,email=?,telefono=?,sito_url=?,utente_modifica=? WHERE id=?',
    [
      empresa.nome,
      empresa.logo_url ?? null,
      empresa.indirizzo ?? null,
      empresa.citta ?? null,
      empresa.latitudine ?? null,
      empresa.longitudine ?? null,
      empresa.ora_partenza.length === 5 ? `${empresa.ora_partenza}:00` : empresa.ora_partenza,
      empresa.email ?? null,
      empresa.telefono ?? null,
      empresa.sito_url ?? null,
      usuarioId,
      empresaActual()
    ]
  );
  return obtenerEmpresa();
}
