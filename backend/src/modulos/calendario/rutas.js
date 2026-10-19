import { Router } from 'express';
import { enTransaccion } from '../../base-datos/pool.js';
import { autorizar, esTecnico, exigirSesion, ROLES_ADMINISTRADOR } from '../../intermedios/sesion.js';
import { crearActividad } from '../actividades/servicio.js';
import {
  actualizarEntradaCalendario,
  esquemaProgramacion,
  esquemaReprogramacion,
  listarCalendario,
  obtenerEntradaCalendario,
  resumenCalendario
} from './servicio.js';

export const rutasCalendario = Router();

rutasCalendario.get('/calendario', exigirSesion, async (req, res) => {
  const filtros = {
    clienteId: req.query.cliente_id,
    desde: req.query.desde,
    hasta: req.query.hasta,
    estado: req.query.estado
  };
  if (esTecnico(req)) filtros.tecnicoId = req.utente.sub;
  res.json(await listarCalendario(filtros));
});

rutasCalendario.get('/calendario/resumen', exigirSesion, async (req, res) => {
  res.json(await resumenCalendario({ tecnicoId: esTecnico(req) ? req.utente.sub : null }));
});

rutasCalendario.post('/calendario/:id/programar', exigirSesion, autorizar(...ROLES_ADMINISTRADOR), async (req, res) => {
  const entrada = esquemaProgramacion.safeParse(req.body);
  if (!entrada.success) return res.status(422).json({ errore: 'Dati programmazione non validi', dettagli: entrada.error.flatten() });

  const registro = await obtenerEntradaCalendario(req.params.id);
  if (!registro || !registro.cliente_id) return res.status(404).json({ errore: 'Voce di calendario non trovata' });

  try {
    const id = await enTransaccion(async (conexion) => {
      const actividadId = await crearActividad(
        conexion,
        {
          clienteId: registro.cliente_id,
          macchinaId: registro.fk_macchina,
          osservazione:
            entrada.data.osservazione ||
            `Manutenzione programmata: ${registro.pezzo ?? 'controllo macchina'} ogni ${registro.frequenza_mesi} mesi`,
          tecnici: entrada.data.tecnici,
          scadenza: entrada.data.scadenza || registro.prossima_manutenzione,
          priorita: entrada.data.priorita,
          richiedeAppuntamento: entrada.data.richiedeAppuntamento
        },
        req.utente.sub
      );
      await conexion.execute(
        'UPDATE calendario_manutenzioni_macchine SET fk_attivita=?,stato_calendario="programmato",utente_modifica=? WHERE id=?',
        [actividadId, req.utente.sub, req.params.id]
      );
      return actividadId;
    });
    return res.status(201).json({ attivitaId: id });
  } catch (error) {
    return res.status(400).json({ errore: error.message || 'Impossibile programmare la manutenzione' });
  }
});

rutasCalendario.put('/calendario/:id', exigirSesion, autorizar(...ROLES_ADMINISTRADOR), async (req, res) => {
  const entrada = esquemaReprogramacion.safeParse(req.body);
  if (!entrada.success) return res.status(422).json({ errore: 'Dati non validi', dettagli: entrada.error.flatten() });

  const registro = await obtenerEntradaCalendario(req.params.id);
  if (!registro) return res.status(404).json({ errore: 'Voce di calendario non trovata' });

  await actualizarEntradaCalendario(req.params.id, entrada.data, req.utente.sub);
  return res.json({ id: req.params.id });
});
