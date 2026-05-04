import { z } from 'zod';

const coerceIdOptionalNullable = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
  z.number().int().positive().nullable(),
);

const coerceMembroIds = z.preprocess(
  (val) => {
    if (!Array.isArray(val)) return [];
    return val
      .map((v) => (v === '' || v === null || v === undefined ? null : Number(v)))
      .filter((n) => Number.isInteger(n) && n > 0);
  },
  z.array(z.number().int().positive()).max(200, 'Máximo de 200 membros por equipe.'),
);

/**
 * POST /equipes — campos lidos por `equipeService.createEquipe`.
 */
export const createEquipeSchema = z.object({
  nome: z.string({ message: 'Nome da equipe é obrigatório.' })
    .trim().min(2, 'Nome deve ter pelo menos 2 caracteres.').max(100),
  descricao: z.string().trim().max(500).optional().nullable(),
  liderId: coerceIdOptionalNullable.optional(),
  filialId: coerceIdOptionalNullable.optional(),
  membroIds: coerceMembroIds.optional().default([]),
});

/**
 * PUT /equipes/:id — partial + suporta `ativo`.
 */
export const updateEquipeSchema = z.object({
  nome: z.string().trim().min(2).max(100).optional(),
  descricao: z.string().trim().max(500).optional().nullable(),
  liderId: coerceIdOptionalNullable.optional(),
  filialId: coerceIdOptionalNullable.optional(),
  ativo: z.boolean().optional(),
  membroIds: coerceMembroIds.optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Pelo menos um campo deve ser informado.' },
);