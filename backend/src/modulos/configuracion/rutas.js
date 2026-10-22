import { Router } from 'express';
import { z } from 'zod';
import { consultar, consultarUno, enTransaccion } from '../../base-datos/pool.js';
import { responderError } from '../../intermedios/errores.js';
import { exigirPermiso } from '../../intermedios/permisos.js';
import { exigirSesion } from '../../intermedios/sesion.js';
import { actualizarPermisosRol, listarRolesConPermisos } from '../permisos/servicio.js';
import {
  actualizarRegistro,
  crearRegistro,
  desactivarRegistro,
  consultaListado,
  obtenerCatalogo,
  prepararRegistro
} from './servicio.js';

export const rutasConfiguracion = Router();

rutasConfiguracion.use('/configurazione/:risorsa', exigirSesion, exigirPermiso('configuracion', 'editar'));

rutasConfiguracion.get('/configurazione/roles', async (_req, res) => {
  return res.json({ roles: await listarRolesConPermisos() });
});

rutasConfiguracion.put('/configurazione/roles/:id', async (req, res) => {
  const id = z.string().uuid().safeParse(req.params.id);
  if (!id.success) return res.status(404).json({ errore: 'Ruolo non trovato' });

  const entrada = z
    .object({
      permisos: z
        .array(
          z.object({
            codice: z.string().trim().min(2).max(40),
            ver: z.boolean().default(false),
            modificar: z.boolean().default(false)
          })
        )
        .max(100)
    })
    .safeParse(req.body);
  if (!entrada.success) return res.status(422).json({ errore: 'Permessi non validi' });

  const rol = await consultarUno('SELECT id,codice FROM ruoli WHERE id=?', [id.data]);
  if (!rol) return res.status(404).json({ errore: 'Ruolo non trovato' });

  const dashboard = entrada.data.permisos.find((permiso) => permiso.codice === 'dashboard');
  if (!dashboard?.ver) {
    return res.status(400).json({ errore: 'Ogni ruolo deve conservare l’accesso alla Panoramica' });
  }
  if (rol.codice === 'amministratore') {
    const configuracion = entrada.data.permisos.find((permiso) => permiso.codice === 'configuracion');
    if (!configuracion?.ver || !configuracion?.modificar) {
      return res.status(400).json({ errore: 'L’amministratore deve conservare l’accesso a Impostazioni' });
    }
  }

  try {
    await enTransaccion((conexion) => actualizarPermisosRol(conexion, rol.id, entrada.data.permisos, req.utente.sub));
    return res.json({ roles: await listarRolesConPermisos() });
  } catch (error) {
    return res.status(400).json({ errore: error.message || 'Impossibile aggiornare i permessi' });
  }
});

rutasConfiguracion.get('/configurazione/:risorsa', async (req, res) => {
  const catalogo = obtenerCatalogo(req.params.risorsa);
  if (!catalogo) return res.status(404).json({ errore: 'Risorsa non configurabile' });
  return res.json(await consultar(consultaListado(catalogo), [req.empresaId]));
});

rutasConfiguracion.post('/configurazione/:risorsa', async (req, res) => {
  try {
    const catalogo = obtenerCatalogo(req.params.risorsa);
    if (!catalogo) return res.status(404).json({ errore: 'Risorsa non configurabile' });
    const registro = await prepararRegistro(req.params.risorsa, catalogo, req.body, { esCreacion: true });
    const creado = await crearRegistro(req.params.risorsa, catalogo, registro, req.utente.sub);
    return res.status(201).json(creado);
  } catch (error) {
    return responderError(res, error, 'Dati non validi');
  }
});

rutasConfiguracion.put('/configurazione/:risorsa/:id', async (req, res) => {
  try {
    const catalogo = obtenerCatalogo(req.params.risorsa);
    if (!catalogo) return res.status(404).json({ errore: 'Risorsa non configurabile' });
    const id = z.string().uuid().parse(req.params.id);
    const registro = await prepararRegistro(req.params.risorsa, catalogo, req.body, { esCreacion: false });
    await actualizarRegistro(req.params.risorsa, catalogo, id, registro, req.utente.sub);
    return res.json({ id });
  } catch (error) {
    return responderError(res, error, 'Dati non validi');
  }
});

rutasConfiguracion.delete('/configurazione/:risorsa/:id', async (req, res) => {
  const catalogo = obtenerCatalogo(req.params.risorsa);
  if (!catalogo) return res.status(404).json({ errore: 'Risorsa non configurabile' });
  try {
    const id = z.string().uuid().parse(req.params.id);
    await desactivarRegistro(req.params.risorsa, catalogo, id, req.utente.sub);
    return res.status(204).end();
  } catch (error) {
    return responderError(res, error, 'Impossibile disattivare il record');
  }
});
