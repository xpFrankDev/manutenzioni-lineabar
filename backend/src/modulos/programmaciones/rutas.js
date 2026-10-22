import { Router } from 'express';
import { consultar } from '../../base-datos/pool.js';
import { z } from 'zod';
import { exigirPermiso } from '../../intermedios/permisos.js';
import { autorizar, exigirSesion } from '../../intermedios/sesion.js';
import {
  actualizarEstadoActividad,
  actualizarEstadoProgramacion,
  generarProgramacion,
  listarCandidatos,
  listarProgramaciones,
  obtenerProgramacion,
  tomarProgramacion
} from './servicio.js';

export const rutasProgrammaciones = Router();

const uuid = z.string().uuid();
const fecha = z.string().date();
const estadosProgramacion = z.enum(['in_corso', 'completata', 'annullata']);
const estadosActividad = z.enum(['in_viaggio', 'in_corso', 'completata']);

rutasProgrammaciones.get('/programmazioni/candidati', exigirSesion, autorizar('amministratore'), async (req, res) => {
  const data = fecha.safeParse(req.query.data);
  if (!data.success) return res.status(422).json({ errore: 'Data non valida' });
  return res.json(await listarCandidatos({ fecha: data.data }));
});

rutasProgrammaciones.post('/programmazioni/genera', exigirSesion, autorizar('amministratore'), async (req, res) => {
  const entrada = z
    .object({
      data: fecha,
      tecnicoId: uuid,
      maxTappe: z.coerce.number().int().min(3).max(6).default(6),
      minutiMin: z.coerce.number().int().min(5).max(90).default(10),
      minutiMax: z.coerce.number().int().min(10).max(120).default(30),
      furgoneId: uuid.nullable().optional().default(null),
      tipoLavoroId: uuid.nullable().optional().default(null),
      numeroTecnici: z.coerce.number().int().min(1).max(20).default(1),
      oraPartenza: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional().default(null)
    })
    .refine((datos) => datos.minutiMin <= datos.minutiMax, 'Intervallo tempi non valido')
    .safeParse(req.body);
  if (!entrada.success) return res.status(422).json({ errore: 'Parametri di programmazione non validi', dettagli: entrada.error.flatten() });
  try {
    const { data, tecnicoId, maxTappe, minutiMin, minutiMax, furgoneId, tipoLavoroId, numeroTecnici, oraPartenza } = entrada.data;
    const resultado = await generarProgramacion({
      data,
      tecnicoId,
      maxTappe,
      minutosMin: minutiMin,
      minutosMax: minutiMax,
      furgoneId,
      tipoLavoroId,
      numeroTecnici,
      oraPartenza,
      usuarioId: req.utente.sub
    });
    return res.status(201).json(resultado);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('Errore programmazione:', error);
    return res.status(400).json({ errore: 'Impossibile generare la programmazione' });
  }
});

rutasProgrammaciones.get('/programmazioni/parametri', exigirSesion, autorizar('amministratore'), async (req, res) => {
  const [empresa] = await consultar(
    'SELECT id,nome,logo_url,latitudine,longitudine,citta,ora_partenza FROM aziende WHERE id=? AND stato="attivo"',
    [req.empresaId]
  );
  const [furgoni, tipiLavoro] = await Promise.all([
    consultar('SELECT id,nome,targa,capacita_tecnici FROM furgoni WHERE fk_azienda=? AND stato="attivo" ORDER BY nome', [req.empresaId]),
    consultar('SELECT id,codice,nome,durata_minuti,tipo_macchina FROM tipi_lavoro WHERE fk_azienda=? AND stato="attivo" ORDER BY nome', [req.empresaId])
  ]);
  return res.json({ azienda: empresa ?? null, furgoni, tipiLavoro });
});

rutasProgrammaciones.get('/programmazioni', exigirSesion, async (req, res) => {
  return res.json(await listarProgramaciones(req.utente));
});

rutasProgrammaciones.get('/programmazioni/:id', exigirSesion, async (req, res) => {
  const id = uuid.safeParse(req.params.id);
  if (!id.success) return res.status(404).json({ errore: 'Programmazione non trovata' });
  const programacion = await obtenerProgramacion(id.data, req.utente);
  if (!programacion) return res.status(404).json({ errore: 'Programmazione non trovata' });
  return res.json(programacion);
});

rutasProgrammaciones.post('/programmazioni/:id/prendi', exigirSesion, async (req, res) => {
  const id = uuid.safeParse(req.params.id);
  if (!id.success) return res.status(404).json({ errore: 'Programmazione non trovata' });
  const resultado = await tomarProgramacion(id.data, req.utente);
  if (resultado.estado === 'no_encontrada') return res.status(404).json({ errore: 'Programmazione non trovata' });
  if (resultado.estado === 'ajena') return res.status(403).json({ errore: 'Programmazione assegnata a un altro tecnico' });
  return res.json({ id: id.data, stato: 'in_corso' });
});

rutasProgrammaciones.patch('/programmazioni/:id/stato', exigirSesion, async (req, res) => {
  const id = uuid.safeParse(req.params.id);
  const estado = estadosProgramacion.safeParse(req.body?.stato);
  if (!id.success) return res.status(404).json({ errore: 'Programmazione non trovata' });
  if (!estado.success) return res.status(422).json({ errore: 'Stato non valido' });
  if (estado.data === 'annullata' && req.utente.ruolo !== 'amministratore') {
    return res.status(403).json({ errore: 'Permessi insufficienti' });
  }
  const actualizado = await actualizarEstadoProgramacion(id.data, estado.data, req.utente);
  if (!actualizado) return res.status(404).json({ errore: 'Programmazione non trovata' });
  return res.json({ id: id.data, stato: estado.data });
});

rutasProgrammaciones.patch('/attivita/:id/stato', exigirSesion, exigirPermiso('tareas'), async (req, res) => {
  const id = uuid.safeParse(req.params.id);
  const estado = estadosActividad.safeParse(req.body?.stato);
  if (!id.success) return res.status(404).json({ errore: 'Attività non trovata' });
  if (!estado.success) return res.status(422).json({ errore: 'Stato non valido' });
  const resultado = await actualizarEstadoActividad(id.data, estado.data, req.utente);
  if (resultado.estado === 'no_encontrada') return res.status(404).json({ errore: 'Attività non trovata' });
  if (resultado.estado === 'ajena') return res.status(403).json({ errore: 'Attività assegnata a un altro tecnico' });
  return res.json({ id: id.data, stato: estado.data, programmazioneId: resultado.programmazioneId ?? null });
});
