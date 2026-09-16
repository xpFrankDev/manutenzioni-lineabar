import { Router } from 'express';
import { exigirSesion } from '../../intermedios/sesion.js';
import { obtenerTablero } from './servicio.js';

export const rutasTablero = Router();

rutasTablero.get('/dashboard', exigirSesion, async (req, res) => res.json(await obtenerTablero(req)));
