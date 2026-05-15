/**
 * Schemas Zod pra CRUD admin de API keys.
 */
import { z } from 'zod';

// Cada URL deve ser parseável e usar http/https. Validamos no create pra
// rejeitar lixo cedo — sem isso o match em middleware silenciosamente nunca
// bateria.
const urlSchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine((val) => {
    try {
      const u = new URL(val);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'URL inválida (precisa ser http:// ou https://).');

export const createApiKeySchema = z.object({
  name: z.string().trim().min(3, 'Nome deve ter pelo menos 3 caracteres.').max(120),
  filialId: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().int().positive().nullable(),
  ).optional(),
  source: z.string().trim().max(120).optional().nullable(),
  expiresAt: z.string().datetime({ offset: true }).optional().nullable(),
  allowedOrigins: z.array(urlSchema).max(20).optional().default([]),
});
