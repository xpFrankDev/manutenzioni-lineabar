import { Router } from 'express';
import { z } from 'zod';
import { consultar } from '../../base-datos/pool.js';
import { responderError } from '../../intermedios/errores.js';
import { autorizar, exigirSesion, ROLES_ADMINISTRADOR } from '../../intermedios/sesion.js';
import {
  actualizarRegistro,
  crearRegistro,
  desactivarRegistro,
  obtenerCatalogo,
  prepararRegistro
} from './servicio.js';

export const rutasConfiguracion = Router();

rutasConfiguracion.use('/configurazione/:risorsa', exigirSesion, autorizar(...ROLES_ADMINISTRADOR));

rutasConfiguracion.get('/configurazione/:risorsa', async (req, res) => {
  const catalogo = obtenerCatalogo(req.params.risorsa);
  if (!catalogo) return res.status(404).json({ errore: 'Risorsa non configurabile' });
  return res.json(await consultar(catalogo.listado));
});

rutasConfiguracion.post('/configurazione/:risorsa', async (req, res) => {
  try {
    const catalogo = obtenerCatalogo(req.params.risorsa);
    if (!catalogo) return res.status(404).json({ errore: 'Risorsa non configurabile' });
    const registro = await prepararRegistro(req.params.risorsa, catalogo, req.body);
    const id = await crearRegistro(req.params.risorsa, catalogo, registro, req.utente.sub);
    return res.status(201).json({ id });
  } catch (error) {
    return responderError(res, error, 'Dati non validi');
  }
});

rutasConfiguracion.put('/configurazione/:risorsa/:id', async (req, res) => {
  try {
    const catalogo = obtenerCatalogo(req.params.risorsa);
    if (!catalogo) return res.status(404).json({ errore: 'Risorsa non configurabile' });
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const registro = await prepararRegistro(req.params.risorsa, catalogo, req.body);
    await actualizarRegistro(req.params.risorsa, catalogo, id, registro, req.utente.sub);
    return res.json({ id });
  } catch (error) {
    return responderError(res, error, 'Dati non validi');
  }
});

rutasConfiguracion.delete('/configurazione/:risorsa/:id', async (req, res) => {
  const catalogo = obtenerCatalogo(req.params.risorsa);
  if (!catalogo) return res.status(404).json({ errore: 'Risorsa non configurabile' });
  await desactivarRegistro(catalogo, req.params.id, req.utente.sub);
  return res.status(204).end();
});
