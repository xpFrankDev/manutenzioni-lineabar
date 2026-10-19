import jwt from 'jsonwebtoken';
import { entorno } from '../configuracion/entorno.js';
import { compararSeguro, esMetodoSeguro } from './cookies.js';

export const ROLES_ADMINISTRADOR = ['amministratore'];

function tokenDe(req) {
  const cookie = req.cookies?.[entorno.cookies.nombreSesion];
  if (cookie) return { token: cookie, origen: 'cookie' };
  const cabecera = req.headers.authorization;
  if (cabecera?.startsWith('Bearer ')) return { token: cabecera.slice(7), origen: 'bearer' };
  return null;
}

export function exigirSesion(req, res, siguiente) {
  const credencial = tokenDe(req);
  if (!credencial) return res.status(401).json({ errore: 'Sessione richiesta' });

  try {
    req.utente = jwt.verify(credencial.token, entorno.sesion.secreto, {
      issuer: entorno.sesion.emisor,
      algorithms: ['HS256']
    });
    req.autenticacion = credencial.origen;
  } catch {
    return res.status(401).json({ errore: 'Sessione non valida o scaduta' });
  }

  // Una sesión emitida antes de implantar CSRF no puede mutar: se fuerza el
  // refresco para que reciba el claim y el cliente vuelva a operar.
  if (credencial.origen === 'cookie' && !req.utente.csrf) {
    return res.status(401).json({ errore: 'Sessione da rinnovare' });
  }

  // La cookie viaja automáticamente: toda mutación exige el CSRF que el JWT
  // transporta y que el cliente guarda solo en memoria.
  if (credencial.origen === 'cookie' && !esMetodoSeguro(req.method)) {
    const esperado = req.utente.csrf;
    const recibido = req.headers['x-csrf-token'];
    if (!esperado || !recibido || !compararSeguro(esperado, recibido)) {
      return res.status(403).json({ errore: 'Token CSRF mancante o non valido' });
    }
  }

  return siguiente();
}

export function autorizar(...ruoli) {
  return (req, res, siguiente) =>
    ruoli.includes(req.utente.ruolo) ? siguiente() : res.status(403).json({ errore: 'Permesso insufficiente' });
}

export function esTecnico(req) {
  return req.utente.ruolo === 'tecnico';
}

export function alcanceTecnico(req, campo = 'm.fk_tecnico') {
  return esTecnico(req) ? { sql: ` AND ${campo}=?`, valores: [req.utente.sub] } : { sql: '', valores: [] };
}
