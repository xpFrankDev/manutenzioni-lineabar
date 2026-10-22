import { Router } from 'express';
import { autorizar, exigirSesion } from '../../intermedios/sesion.js';
import { actualizarEmpresa, obtenerEmpresa } from './servicio.js';

export const rutasEmpresa = Router();

rutasEmpresa.get('/azienda', exigirSesion, async (_req, res) => {
  const empresa = await obtenerEmpresa();
  if (!empresa) return res.status(404).json({ errore: 'Azienda non trovata' });
  return res.json(empresa);
});

rutasEmpresa.put('/azienda', exigirSesion, autorizar('amministratore'), async (req, res) => {
  try {
    return res.json(await actualizarEmpresa(req.body, req.utente.sub));
  } catch (error) {
    return res.status(422).json({ errore: error.message || 'Dati azienda non validi' });
  }
});
