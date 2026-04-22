import { z } from 'zod';

export const createLeadSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório.').max(200),
  sobrenome: z.string().max(200).optional().default(''),
  celular: z.string().min(10, 'Celular deve ter pelo menos 10 dígitos.').max(20),
  cep: z.string().min(8, 'CEP deve ter pelo menos 8 caracteres.').max(10),
  conjugeNome: z.string().max(200).optional().default(''),
  conjugeSobrenome: z.string().max(200).optional().default(''),
  conjugeCelular: z.string().max(20).optional().default(''),
  conjugeEmail: z.string().email('E-mail do cônjuge inválido.').optional().or(z.literal('')).default(''),
  status: z.string().max(50).optional().default('Prospecção'),
  etapa: z.string().max(50).optional().default(''),
  origemCanal: z.string().max(50).optional().default(''),
  preVendedorId: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().int().positive().nullable()
  ),
  idKanban: z.string().max(100).optional().default(''),
});

export const updateLeadSchema = createLeadSchema.partial();

export const transferLeadsSchema = z.object({
  leadIds: z.array(z.number().int().positive()).min(1, 'Selecione ao menos um lead.'),
  preVendedorId: z.preprocess((val) => Number(val), z.number().int().positive('Pré-vendedor é obrigatório.')),
});

export const updateEtapaSchema = z.object({
  leadIds: z.array(z.number().int().positive()).min(1, 'Selecione ao menos um lead.'),
  etapa: z.string().min(1, 'Etapa é obrigatória.').max(50),
});

// ─── Fila da Vez (Client/Lead legado) ────────────────────────────────────

export const quickLeadSchema = z.object({
  branch_id: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number({ message: 'A filial é obrigatória.' }).int().positive()
  ),
  nome: z.string().max(200).optional().default(''),
  telefone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos.').max(20),
  cep: z.string().max(10).optional().default(''),
  sobrenome: z.string().max(200).optional().default(''),
  etapa: z.string().max(50).optional().default('Novo'),
  status: z.string().max(50).optional().default('Ativo'),
  tipoImovel: z.string().max(100).optional().default(''),
  statusImovel: z.string().max(100).optional().default(''),
  pedidosContratos: z.string().max(2000).optional().default(''),
  canal: z.string().max(50).optional().default(''),
  origem: z.string().max(100).optional().default(''),
  parceria: z.string().max(200).optional().default(''),
  gerenteId: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().int().positive().nullable().optional()
  ),
});

export const manualLeadSchema = quickLeadSchema.extend({
  assigned_user_id: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number({ message: 'O vendedor alvo é obrigatório.' }).int().positive()
  ),
});

// ─── Transição de status (Task #9) ───────────────────────────────────────
// Plan §4.1. Aceita os nomes do contrato público (status, motivo, contexto)
// e traduz para o contrato interno do leadTransitionService (newStatus, reason, context).

export const transitionStatusSchema = z.object({
  status: z.string().min(1, 'status é obrigatório.').max(100),
  motivo: z.string().max(1000).optional().nullable(),
  contexto: z
    .object({
      agendadoPara: z.string().datetime({ offset: true }).optional().nullable(),
    })
    .passthrough()
    .optional()
    .default({}),
});

// ─── Temperatura (Task #10) ──────────────────────────────────────────────
// Plan §4.4. Restringe a string a um dos três valores canônicos do enum
// LeadTemperatura — validação redundante com o domain, mas garante rejeição
// antes do service (melhor mensagem de erro e evita round-trip).

export const temperaturaSchema = z.object({
  temperatura: z.enum(['Muito interessado', 'Interessado', 'Sem interesse'], {
    message: 'temperatura deve ser "Muito interessado", "Interessado" ou "Sem interesse".',
  }),
});

export const toggleStatusSchema = z.object({
  branch_id: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number({ message: 'branch_id é obrigatório.' }).int().positive()
  ),
  is_available: z.boolean({ message: 'is_available é obrigatório.' }),
  user_id: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().int().positive().nullable().optional()
  ),
});
