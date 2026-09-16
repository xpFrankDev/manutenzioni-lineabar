import { z } from 'zod';

export const esquemaRecambio = z.object({
  pezzoId: z.coerce.number().int().positive(),
  quantita: z.coerce.number().positive().max(100)
});

export const esquemaIntervento = z.object({
  clienteId: z.coerce.number().int().positive().nullable().optional(),
  macchinaId: z.coerce.number().int().positive(),
  data: z.string().date(),
  ubicazione: z.enum(['cliente', 'magazzino']),
  note: z.string().trim().max(2000).optional().nullable(),
  esito: z.enum(['risolto', 'da_rifare', 'parziale']),
  ore: z.coerce.number().positive().max(24),
  persone: z.coerce.number().int().positive().max(20),
  ricambi: z.array(esquemaRecambio).default([])
});
