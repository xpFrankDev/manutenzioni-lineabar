import { ZodError } from 'zod';

export function responderError(res, error, mensajePorDefecto) {
  const estado = error instanceof ZodError ? 422 : 400;
  return res.status(estado).json({ errore: error.message || mensajePorDefecto });
}

export function manejadorErrores(error, _req, res, _siguiente) {
  console.error(error);
  res.status(500).json({ errore: 'Errore interno' });
}
