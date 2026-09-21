import rateLimit from 'express-rate-limit';

export const limiteAcceso = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false
});

/** El refresco es una operación normal de la sesión: límite más amplio. */
export const limiteRefresco = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 80,
  standardHeaders: true,
  legacyHeaders: false
});

/** Límite general defensivo: alto para no molestar al uso normal en campo. */
export const limiteGeneral = rateLimit({
  windowMs: 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false
});
