import { z } from 'zod';

export const esquemaAcceso = z.object({
  codigo_usuario: z.string().trim().min(5).max(40),
  password: z.string().min(8).max(128)
});
