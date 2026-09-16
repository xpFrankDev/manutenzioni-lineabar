import { Router } from 'express';
import { consultarUno, enTransaccion } from '../../base-datos/pool.js';
import { autorizar, exigirSesion, ROLES_ADMINISTRADOR } from '../../intermedios/sesion.js';
import { esquemaActividad, esquemaCierreActividad } from './esquemas.js';
import {
  actualizarActividad,
  cerrarActividad,
  contarPendientes,
  crearActividad,
  iniciarActividad,
  listarActividades,
  obtenerActividad,
  puedeAccederActividad
} from './servicio.js';

export const rutasActividades = Router();

rutasActividades.get('/attivita', exigirSesion, async (req, res) => res.json(await listarActividades(req)));

rutasActividades.get('/attivita/contatore', exigirSesion, async (req, res) =>
  res.json({ pendenti: await contarPendientes(req) })
);

rutasActividades.get('/attivita/:id', exigirSesion, async (req, res) => {
  if (!(await puedeAccederActividad(req, req.params.id))) {
    return res.status(403).json({ errore: 'Attività non assegnata' });
  }
  const actividad = await obtenerActividad(req.params.id);
  if (!actividad) return res.status(404).json({ errore: 'Attività non trovata' });
  return res.json(actividad);
});

rutasActividades.post('/attivita', exigirSesion, autorizar(...ROLES_ADMINISTRADOR), async (req, res) => {
  const entrada = esquemaActividad.safeParse(req.body);
  if (!entrada.success) {
    return res.status(422).json({ errore: 'Dati attività non validi', dettagli: entrada.error.flatten() });
  }
  try {
    const id = await enTransaccion((conexion) => crearActividad(conexion, entrada.data, req.utente.sub));
    return res.status(201).json({ id });
  } catch (error) {
    return res.status(400).json({ errore: error.message || 'Impossibile creare attività' });
  }
});

rutasActividades.put('/attivita/:id', exigirSesion, autorizar(...ROLES_ADMINISTRADOR), async (req, res) => {
  const entrada = esquemaActividad.safeParse(req.body);
  if (!entrada.success) return res.status(422).json({ errore: 'Dati attività non validi' });
  try {
    await enTransaccion((conexion) => actualizarActividad(conexion, req.params.id, entrada.data, req.utente.sub));
    return res.json({ id: Number(req.params.id) });
  } catch (error) {
    return res.status(400).json({ errore: error.message || 'Impossibile aggiornare attività' });
  }
});

rutasActividades.post('/attivita/:id/prendi', exigirSesion, async (req, res) => {
  if (!(await puedeAccederActividad(req, req.params.id))) {
    return res.status(403).json({ errore: 'Attività non assegnata' });
  }
  await iniciarActividad(req.params.id, req.utente.sub);
  return res.json({ id: Number(req.params.id), stato: 'in_corso' });
});

rutasActividades.post('/attivita/:id/chiudi', exigirSesion, async (req, res) => {
  const entrada = esquemaCierreActividad.safeParse(req.body);
  if (!entrada.success) return res.status(422).json({ errore: 'Dati chiusura non validi' });
  if (!(await puedeAccederActividad(req, req.params.id))) {
    return res.status(403).json({ errore: 'Attività non assegnata' });
  }

  const actividad = await consultarUno('SELECT fk_cliente,fk_macchina FROM attivita WHERE id=? AND stato_attivita<>"completata"', [
    req.params.id
  ]);
  if (!actividad) return res.status(409).json({ errore: 'Attività non disponibile' });

  try {
    const id = await enTransaccion((conexion) =>
      cerrarActividad(conexion, { ...actividad, id: req.params.id }, entrada.data, req.utente.sub)
    );
    return res.json({ id: Number(req.params.id), manutenzioneId: id });
  } catch (error) {
    return res.status(400).json({ errore: error.message || 'Impossibile chiudere attività' });
  }
});

rutasActividades.delete('/attivita/:id', exigirSesion, autorizar(...ROLES_ADMINISTRADOR), async (req, res) => {
  await consultarUno('UPDATE attivita SET stato="inattivo",utente_modifica=? WHERE id=?', [req.utente.sub, req.params.id]);
  res.status(204).end();
});
