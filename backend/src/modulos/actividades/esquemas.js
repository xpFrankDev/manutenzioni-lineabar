import { z } from 'zod';
import { esquemaRecambio } from '../interventos/esquemas.js';

export const esquemaActividad = z.object({
  clienteId: z.coerce.number().int().positive(),
  macchinaId: z.coerce.number().int().positive(),
  osservazione: z.string().trim().min(5).max(3000),
  tecnici: z.array(z.coerce.number().int().positive()).min(1).max(20),
  scadenza: z.string().date(),
  priorita: z.enum(['bassa', 'normale', 'alta']),
  richiedeAppuntamento: z.boolean().default(false)
});

export const esquemaCierreActividad = z.object({
  descrizione: z.string().trim().min(5).max(3000),
  ore: z.coerce.number().positive().max(24),
  persone: z.coerce.number().int().positive().max(20),
  ricambi: z.array(esquemaRecambio).default([])
});
