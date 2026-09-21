import { Router } from 'express';
import { limiteAcceso, limiteRefresco } from '../../intermedios/limite.js';
import { exigirSesion } from '../../intermedios/sesion.js';
import { esquemaAcceso } from './esquemas.js';
import { cerrarSesion, iniciarSesion, renovarSesion } from './servicio.js';

export const rutasAutenticacion = Router();

function datosDelCliente(req) {
  return { agente: req.headers['user-agent'], ip: req.ip };
}

rutasAutenticacion.post('/auth/login', limiteAcceso, async (req, res) => {
  const entrada = esquemaAcceso.safeParse(req.body);
  if (!entrada.success) return res.status(422).json({ errore: 'Credenziali non valide' });

  const sesion = await iniciarSesion(entrada.data.codigo_usuario, entrada.data.password, datosDelCliente(req));
  if (!sesion) return res.status(401).json({ errore: 'Credenziali non valide' });

  return res.json(sesion);
});

rutasAutenticacion.post('/auth/refresh', limiteRefresco, async (req, res) => {
  const sesion = await renovarSesion(req.body?.refresco, datosDelCliente(req));
  if (!sesion) return res.status(401).json({ errore: 'Sessione scaduta' });
  return res.json(sesion);
});

rutasAutenticacion.post('/auth/logout', async (req, res) => {
  await cerrarSesion(req.body?.refresco);
  return res.status(204).end();
});

rutasAutenticacion.get('/auth/sessione', exigirSesion, (req, res) => res.json({ utente: req.utente }));
