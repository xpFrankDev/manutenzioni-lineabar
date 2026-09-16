import { z } from 'zod';
import { esquemaIntervento, esquemaRecambio } from '../interventos/esquemas.js';

export const esquemaBoleta = esquemaIntervento.extend({
  clienteId: z.coerce.number().int().positive(),
  ubicazione: z.literal('cliente'),
  ricambi: z.array(esquemaRecambio).min(1)
});

export const esquemaEstadoBoleta = z.enum(['bozza', 'emessa', 'annullata']);
