import { tienePermiso } from '../modulos/permisos/servicio.js';

/**
 * Middleware de acceso modular por menú. Debe ejecutarse después de
 * `exigirSesion` porque necesita el rol del usuario.
 */
export function exigirPermiso(menuCodigo, accion = 'ver') {
  return async (req, res, siguiente) => {
    if (!req.utente) return res.status(401).json({ errore: 'Sessione richiesta' });
    try {
      if (await tienePermiso(req.utente.ruolo, menuCodigo, accion)) return siguiente();
      return res.status(403).json({ errore: 'Permesso insufficiente' });
    } catch {
      return res.status(503).json({ errore: 'Permessi non disponibili' });
    }
  };
}
