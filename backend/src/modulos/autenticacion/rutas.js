import { Router } from 'express';
import { entorno } from '../../configuracion/entorno.js';
import { establecerCookiesSesion, limpiarCookiesSesion } from '../../intermedios/cookies.js';
import { limiteAcceso, limiteRefresco } from '../../intermedios/limite.js';
import { exigirSesion } from '../../intermedios/sesion.js';
import { esquemaAcceso } from './esquemas.js';
import { permisosDeRol } from '../permisos/servicio.js';
import { cerrarSesion, iniciarSesion, renovarSesion } from './servicio.js';

export const rutasAutenticacion = Router();

function datosDelCliente(req) {
  return { agente: req.headers['user-agent'], ip: req.ip };
}

function responderSesion(res, sesion) {
  establecerCookiesSesion(res, { token: sesion.token, refresco: sesion.refresco });
  return res.json({
    utente: sesion.utente,
    scadeInMinuti: sesion.scadeInMinuti,
    scadeInGiorni: sesion.scadeInGiorni,
    csrf: sesion.csrf,
    menus: sesion.menus,
    // Los clientes de API en desarrollo y los tests siguen usando Bearer;
    // en producción los tokens solo viajan en cookies HttpOnly.
    ...(entorno.produccion ? {} : { token: sesion.token, refresco: sesion.refresco })
  });
}

function refrescoDe(req) {
  return req.cookies?.[entorno.cookies.nombreRefresco] ?? req.body?.refresco ?? null;
}

rutasAutenticacion.post('/auth/login', limiteAcceso, async (req, res) => {
  const entrada = esquemaAcceso.safeParse(req.body);
  if (!entrada.success) return res.status(422).json({ errore: 'Credenziali non valide' });

  const sesion = await iniciarSesion(entrada.data.codigo_usuario, entrada.data.password, datosDelCliente(req));
  if (!sesion) return res.status(401).json({ errore: 'Credenziali non valide' });

  return responderSesion(res, sesion);
});

rutasAutenticacion.post('/auth/refresh', limiteRefresco, async (req, res) => {
  const sesion = await renovarSesion(refrescoDe(req), datosDelCliente(req));
  if (!sesion) {
    limpiarCookiesSesion(res);
    return res.status(401).json({ errore: 'Sessione scaduta' });
  }
  return responderSesion(res, sesion);
});

rutasAutenticacion.post('/auth/logout', async (req, res) => {
  await cerrarSesion(refrescoDe(req));
  limpiarCookiesSesion(res);
  return res.status(204).end();
});

rutasAutenticacion.get('/auth/sessione', exigirSesion, async (req, res) => {
  const menus = await permisosDeRol(req.utente.ruolo);
  return res.json({ utente: req.utente, csrf: req.utente.csrf ?? null, menus });
});
