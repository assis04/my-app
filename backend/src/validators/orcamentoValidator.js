/**
 * Schemas Zod para endpoints de Orçamento.
 * Specs: specs/crm-non.md | Plan: validated-swimming-otter.md §Validators
 */

import { z } from 'zod';
import { MOTIVOS_CANCELAMENTO } from '../domain/orcamentoStatus.js';

/**
 * POST /api/crm/orcamentos — body: { leadId }
 */
export const createOrcamentoSchema = z.object({
  leadId: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number({ message: 'leadId é obrigatório.' }).int().positive(),
  ),
});

/**
 * PUT /api/crm/orcamentos/:id/status — body: { status }
 * Apenas os 3 estados não-terminais — Cancelado e reativação usam endpoints dedicados.
 */
export const transitionOrcamentoSchema = z.object({
  status: z.enum(['Nova O.N.', 'Não Responde', 'Standby'], {
    message: 'status deve ser "Nova O.N.", "Não Responde" ou "Standby". Use /cancel para cancelar.',
  }),
});

/**
 * PUT /api/crm/orcamentos/:id/cancel — body: { motivo }
 * Motivo obrigatório e restrito aos 5 valores canônicos.
 */
export const cancelOrcamentoSchema = z.object({
  motivo: z.enum(MOTIVOS_CANCELAMENTO, {
    message: `motivo deve ser um dos valores canônicos: ${MOTIVOS_CANCELAMENTO.join(' | ')}`,
  }),
});

/**
 * PUT /api/crm/orcamentos/:id/reactivate — body vazio
 */
export const reactivateOrcamentoSchema = z.object({}).strict();
