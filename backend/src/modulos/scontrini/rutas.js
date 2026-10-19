import { Router } from 'express';
import { enTransaccion } from '../../base-datos/pool.js';
import { limiteOcr } from '../../intermedios/limite.js';
import { exigirSesion } from '../../intermedios/sesion.js';
import {
  analizarScontrino,
  crearClienteDesdeScontrino,
  obtenerImagenScontrino,
  obtenerScontrino,
  puedeAccederScontrino
} from './servicio.js';

export const rutasScontrini = Router();

rutasScontrini.post('/scontrini/analisi', limiteOcr, exigirSesion, async (req, res) => {
  try {
    const resultado = await analizarScontrino({
      imagen: req.body?.immagine,
      usuarioId: req.utente.sub,
      clienteId: req.body?.clienteId ? Number(req.body.clienteId) : null
    });
    return res.status(201).json(resultado);
  } catch (error) {
    return res.status(400).json({ errore: error.message || 'Analisi non riuscita' });
  }
});

rutasScontrini.get('/scontrini/:id', exigirSesion, async (req, res) => {
  if (!(await puedeAccederScontrino(req.utente, req.params.id))) {
    return res.status(403).json({ errore: 'Scontrino non assegnato' });
  }
  const scontrino = await obtenerScontrino(req.params.id);
  if (!scontrino) return res.status(404).json({ errore: 'Scontrino non trovato' });
  return res.json(scontrino);
});

rutasScontrini.get('/scontrini/:id/immagine', exigirSesion, async (req, res) => {
  if (!(await puedeAccederScontrino(req.utente, req.params.id))) {
    return res.status(403).json({ errore: 'Scontrino non assegnato' });
  }
  const imagen = await obtenerImagenScontrino(req.params.id);
  if (!imagen) return res.status(404).json({ errore: 'Immagine non trovata' });
  res.setHeader('Content-Type', imagen.tipo_mime);
  res.setHeader('Cache-Control', 'private, max-age=300');
  return res.send(imagen.immagine);
});

rutasScontrini.post('/scontrini/:id/cliente', exigirSesion, async (req, res) => {
  if (!(await puedeAccederScontrino(req.utente, req.params.id))) {
    return res.status(403).json({ errore: 'Scontrino non assegnato' });
  }
  try {
    const resultado = await enTransaccion((conexion) =>
      crearClienteDesdeScontrino(conexion, req.params.id, req.body ?? {}, req.utente.sub)
    );
    return res.status(resultado.creado ? 201 : 200).json(resultado);
  } catch (error) {
    return res.status(400).json({ errore: error.message || 'Impossibile creare il cliente' });
  }
});
