import { Router } from 'express';
import { z } from 'zod';
import { enTransaccion } from '../../base-datos/pool.js';
import { limiteFotos } from '../../intermedios/limite.js';
import { autorizar, exigirSesion, ROLES_ADMINISTRADOR } from '../../intermedios/sesion.js';
import {
  eliminarFotoMaquina,
  guardarFotoMaquina,
  listarAccesosMaquina,
  obtenerDetalleMaquina,
  obtenerImagenMaquina,
  puedeAccederMaquina,
  sincronizarAccesosMaquina
} from './servicio.js';

export const rutasMaquinas = Router();

const esquemaUuid = z.string().uuid();

function idValido(valor) {
  const resultado = esquemaUuid.safeParse(valor);
  return resultado.success ? resultado.data : null;
}

/** Solo se responde a la ficha de una máquina con sesión y autorización. */
rutasMaquinas.get('/maquinas/:id', exigirSesion, async (req, res) => {
  const id = idValido(req.params.id);
  if (!id) return res.status(404).json({ errore: 'Macchina non trovata' });
  if (!(await puedeAccederMaquina(req.utente, id))) {
    return res.status(403).json({ errore: 'Accesso non autorizzato' });
  }
  const detalle = await obtenerDetalleMaquina(id);
  if (!detalle) return res.status(404).json({ errore: 'Macchina non trovata' });
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  return res.json(detalle);
});

rutasMaquinas.get('/maquinas/:id/foto/:fotoId', exigirSesion, async (req, res) => {
  const id = idValido(req.params.id);
  const fotoId = idValido(req.params.fotoId);
  if (!id || !fotoId) return res.status(404).json({ errore: 'Foto non trovata' });
  if (!(await puedeAccederMaquina(req.utente, id))) {
    return res.status(403).json({ errore: 'Accesso non autorizzato' });
  }
  const imagen = await obtenerImagenMaquina(id, fotoId);
  if (!imagen) return res.status(404).json({ errore: 'Foto non trovata' });
  res.setHeader('Content-Type', imagen.tipo_mime);
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  return res.send(imagen.immagine);
});

rutasMaquinas.post('/maquinas/:id/foto', limiteFotos, exigirSesion, async (req, res) => {
  const id = idValido(req.params.id);
  if (!id) return res.status(404).json({ errore: 'Macchina non trovata' });
  if (!(await puedeAccederMaquina(req.utente, id))) {
    return res.status(403).json({ errore: 'Accesso non autorizzato' });
  }
  try {
    const foto = await guardarFotoMaquina(id, req.body ?? {}, req.utente.sub);
    return res.status(201).json(foto);
  } catch (error) {
    return res.status(400).json({ errore: error.message || 'Impossibile salvare la foto' });
  }
});

rutasMaquinas.delete('/maquinas/:id/foto/:fotoId', exigirSesion, async (req, res) => {
  const id = idValido(req.params.id);
  const fotoId = idValido(req.params.fotoId);
  if (!id || !fotoId) return res.status(404).json({ errore: 'Foto non trovata' });
  if (!(await puedeAccederMaquina(req.utente, id))) {
    return res.status(403).json({ errore: 'Accesso non autorizzato' });
  }
  const resultado = await eliminarFotoMaquina(id, fotoId, req.utente);
  if (resultado === false) return res.status(404).json({ errore: 'Foto non trovata' });
  if (resultado === null) return res.status(403).json({ errore: 'Permesso insufficiente' });
  return res.status(204).end();
});

rutasMaquinas.get('/maquinas/:id/accesos', exigirSesion, autorizar(...ROLES_ADMINISTRADOR), async (req, res) => {
  const id = idValido(req.params.id);
  if (!id) return res.status(404).json({ errore: 'Macchina non trovata' });
  const detalle = await obtenerDetalleMaquina(id);
  if (!detalle) return res.status(404).json({ errore: 'Macchina non trovata' });
  return res.json({ tecnici: await listarAccesosMaquina(id) });
});

rutasMaquinas.put('/maquinas/:id/accesos', exigirSesion, autorizar(...ROLES_ADMINISTRADOR), async (req, res) => {
  const id = idValido(req.params.id);
  if (!id) return res.status(404).json({ errore: 'Macchina non trovata' });
  const entrada = z.object({ usuarios: z.array(z.string().uuid()).max(100) }).safeParse(req.body);
  if (!entrada.success) return res.status(422).json({ errore: 'Accesos no validos' });
  const detalle = await obtenerDetalleMaquina(id);
  if (!detalle) return res.status(404).json({ errore: 'Macchina non trovata' });
  try {
    await enTransaccion((conexion) =>
      sincronizarAccesosMaquina(conexion, id, entrada.data.usuarios, req.utente.sub)
    );
    return res.json({ tecnici: await listarAccesosMaquina(id) });
  } catch (error) {
    return res.status(400).json({ errore: error.message || 'Impossibile aggiornare gli accessi' });
  }
});
