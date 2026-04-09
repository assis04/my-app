import { z } from 'zod';

export const createTaskSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório.').max(300),
  descricao: z.string().max(2000).optional().default(''),
  status: z.enum(['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA']).optional().default('PENDENTE'),
  dataVencimento: z.string().datetime({ offset: true }).optional().or(z.literal('')).or(z.literal(null)).optional(),
  assignedToUserId: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().int().positive().nullable()
  ).optional(),
  assignedToEquipeId: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().int().positive().nullable()
  ).optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

export const updateTaskStatusSchema = z.object({
  status: z.enum(['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA'], {
    errorMap: () => ({ message: 'Status inválido. Use: PENDENTE, EM_ANDAMENTO, CONCLUIDA.' }),
  }),
});
