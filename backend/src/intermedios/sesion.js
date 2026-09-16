import jwt from 'jsonwebtoken';
import { entorno } from '../configuracion/entorno.js';

export const ROLES_ADMINISTRADOR = ['amministratore'];

export function exigirSesion(req, res, siguiente) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ errore: 'Sessione richiesta' });
  try {
    req.utente = jwt.verify(token, entorno.sesion.secreto, { issuer: entorno.sesion.emisor });
    return siguiente();
  } catch {
    return res.status(401).json({ errore: 'Sessione non valida o scaduta' });
  }
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
