/**
 * Schemas Zod pra CRUD admin de API keys.
 */
import { z } from 'zod';

export const createApiKeySchema = z.object({
  name: z.string().trim().min(3, 'Nome deve ter pelo menos 3 caracteres.').max(120),
  filialId: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().int().positive().nullable(),
  ).optional(),
  source: z.string().trim().max(120).optional().nullable(),
  expiresAt: z.string().datetime({ offset: true }).optional().nullable(),
});
