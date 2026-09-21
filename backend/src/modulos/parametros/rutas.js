import { Router } from 'express';
import { z } from 'zod';
import { responderError } from '../../intermedios/errores.js';
import { autorizar, exigirSesion, ROLES_ADMINISTRADOR } from '../../intermedios/sesion.js';
import { actualizarParametros, obtenerParametros } from './servicio.js';

export const rutasParametros = Router();

export const esquemaParametros = z
  .array(
    z.object({
      chiave: z.string().trim().min(3).max(60),
      valore: z.union([z.string().trim().max(190), z.number()])
    })
  )
  .min(1)
  .max(50);

rutasParametros.get('/parametros', exigirSesion, async (_req, res) => res.json(await obtenerParametros()));

rutasParametros.put('/parametros', exigirSesion, autorizar(...ROLES_ADMINISTRADOR), async (req, res) => {
  try {
    const entradas = esquemaParametros.parse(req.body?.parametros ?? req.body);
    await actualizarParametros(entradas, req.utente.sub);
    return res.json(await obtenerParametros());
  } catch (error) {
    return responderError(res, error, 'Parametri non validi');
  }
});
