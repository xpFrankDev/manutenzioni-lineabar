import { z } from 'zod';

export const esquemaRecambio = z.object({
  pezzoId: z.string().uuid(),
  quantita: z.coerce.number().positive().max(100)
});

export const esquemaIntervento = z.object({
  clienteId: z.string().uuid().nullable().optional(),
  macchinaId: z.string().uuid(),
  data: z.string().date(),
  ubicazione: z.enum(['cliente', 'magazzino']),
  note: z.string().trim().max(2000).optional().nullable(),
  esito: z.enum(['risolto', 'da_rifare', 'parziale']),
  ore: z.coerce.number().positive().max(24),
  persone: z.coerce.number().int().positive().max(20),
  ricambi: z.array(esquemaRecambio).max(60).default([]),
  scontrinoId: z.string().uuid().nullable().optional()
});
