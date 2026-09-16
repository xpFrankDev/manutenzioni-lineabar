import { Router } from 'express';
import { limiteAcceso } from '../../intermedios/limite.js';
import { exigirSesion } from '../../intermedios/sesion.js';
import { esquemaAcceso } from './esquemas.js';
import { iniciarSesion } from './servicio.js';

export const rutasAutenticacion = Router();

rutasAutenticacion.post('/auth/login', limiteAcceso, async (req, res) => {
  const entrada = esquemaAcceso.safeParse(req.body);
  if (!entrada.success) return res.status(422).json({ errore: 'Credenziali non valide' });

  const sesion = await iniciarSesion(entrada.data.codigo_usuario, entrada.data.password);
  if (!sesion) return res.status(401).json({ errore: 'Credenziali non valide' });

  return res.json(sesion);
});

rutasAutenticacion.get('/auth/sessione', exigirSesion, (req, res) => res.json({ utente: req.utente }));
