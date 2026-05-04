import { z } from 'zod';

const coerceIdOptionalNullable = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
  z.number().int().positive().nullable(),
);

/**
 * POST /filiais — apenas ADM pode criar (gate na rota).
 */
export const createFilialSchema = z.object({
  nome: z.string({ message: 'Nome da filial é obrigatório.' })
    .trim().min(2, 'Nome deve ter pelo menos 2 caracteres.').max(100),
  endereco: z.string().trim().max(300).optional().nullable(),
  managerId: coerceIdOptionalNullable.optional(),
});

/**
 * PUT /filiais/:id — partial.
 */
export const updateFilialSchema = z.object({
  nome: z.string().trim().min(2).max(100).optional(),
  endereco: z.string().trim().max(300).optional().nullable(),
  managerId: coerceIdOptionalNullable.optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Pelo menos um campo deve ser informado.' },
);