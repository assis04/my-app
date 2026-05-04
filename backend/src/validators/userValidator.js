import { z } from 'zod';

/**
 * Helpers de coerção — aceitam o que o frontend manda (string vinda de form
 * + number/null inflados pelo `parseInt(... , 10)` em alguns paths) e
 * normalizam para o tipo que o Prisma espera.
 */
const coerceIdRequired = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
  z.number({ message: 'ID inválido.' }).int().positive(),
);

const coerceIdOptionalNullable = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
  z.number().int().positive().nullable(),
);

/**
 * POST /users/create — body que o controller `createUserByAdminOrHR` lê.
 * Campos extras são silenciosamente descartados (default Zod).
 */
export const createUserSchema = z.object({
  nome: z.string({ message: 'Nome é obrigatório.' }).trim().min(2, 'Nome deve ter pelo menos 2 caracteres.').max(200),
  email: z.string({ message: 'E-mail é obrigatório.' }).trim().toLowerCase()
    .email('E-mail inválido.').max(255),
  password: z.string({ message: 'Senha é obrigatória.' })
    .min(8, 'Senha deve ter pelo menos 8 caracteres.').max(100),
  roleId: coerceIdRequired,
  filialId: coerceIdOptionalNullable.optional(),
});

/**
 * PUT /users/:id — todos os campos opcionais. Permite update parcial.
 * `password` quando fornecida segue a regra de min 8.
 * `ativo` aceita boolean nativo.
 */
export const updateUserSchema = z.object({
  nome: z.string().trim().min(2).max(200).optional(),
  email: z.string().trim().toLowerCase().email('E-mail inválido.').max(255).optional(),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres.').max(100).optional(),
  roleId: coerceIdRequired.optional(),
  filialId: coerceIdOptionalNullable.optional(),
  ativo: z.boolean().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Pelo menos um campo deve ser informado para atualização.' },
);