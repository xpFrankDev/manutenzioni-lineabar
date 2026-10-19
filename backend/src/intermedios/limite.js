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

/**
 * El análisis OCR consume CPU y memoria del servidor: tiene un límite propio
 * más bajo que el general para que una ráfaga de fotos no bloquee la API.
 */
export const limiteOcr = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false
});

/** Subida de fotos de máquina: menos frecuente que el uso normal de la API. */
export const limiteFotos = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
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
