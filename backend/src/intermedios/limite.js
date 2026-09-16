import rateLimit from 'express-rate-limit';

export const limiteAcceso = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false
});
