/**
 * Schema Zod pro intake público de leads (origens externas).
 *
 * Mais restritivo que o createLeadSchema interno: aceita só campos
 * essenciais que um form externo precisa enviar. Validações strict
 * pra evitar payloads abusivos.
 *
 * Spec: specs/api-public.md
 */
import { z } from 'zod';

export const publicLeadSchema = z.object({
  nome: z.string().trim().min(2, 'Nome muito curto.').max(120),
  sobrenome: z.string().trim().max(120).optional().default(''),
  celular: z.string().trim().min(10, 'Celular deve ter pelo menos 10 dígitos.').max(20),
  email: z.string().email('E-mail inválido.').optional().or(z.literal('')).default(''),
  cep: z.string().trim().min(8, 'CEP deve ter pelo menos 8 caracteres.').max(10),
  origemCanal: z.string().trim().max(50).optional().default(''),
  // Identificador adicional opcional vindo do formulário (UTM, campaign id).
  // Concatenado com api_key.source em LeadHistory.payload.
  source: z.string().trim().max(120).optional().default(''),
});
