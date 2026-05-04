import { z } from 'zod';

/**
 * Schemas para Role. A validação semântica das `permissions` (lista canônica
 * + bloqueio de wildcard pra não-ADM) continua no `roleService.validatePermissions`
 * porque depende do contexto do caller (callerRole). Aqui só garantimos
 * forma e tamanho.
 */

const permissionsSchema = z.array(
  z.string().min(1).max(100),
  { message: 'permissions deve ser uma lista de strings.' },
).max(100, 'Máximo de 100 permissions por role.');

/**
 * POST /roles — gate `rh:perfis:create`.
 */
export const createRoleSchema = z.object({
  nome: z.string({ message: 'Nome do perfil é obrigatório.' })
    .trim().min(2, 'Nome deve ter pelo menos 2 caracteres.').max(50),
  descricao: z.string().trim().max(300).optional().nullable(),
  permissions: permissionsSchema.optional().default([]),
});

/**
 * PUT /roles/:id — partial. Service rejeita alterar role 'ADM'.
 */
export const updateRoleSchema = z.object({
  nome: z.string().trim().min(2).max(50).optional(),
  descricao: z.string().trim().max(300).optional().nullable(),
  permissions: permissionsSchema.optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Pelo menos um campo deve ser informado.' },
);