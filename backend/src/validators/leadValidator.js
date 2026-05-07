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
  origemCanal: z.string().max(50).optional().default(''),
  preVendedorId: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().int().positive().nullable()
  ),
  // status / etapa: NÃO estão no schema. status é forçado ao valor canônico
  // "Em prospecção" pelo createLead (leadCrmService); etapa é derivada do
  // status via STATUS_TO_ETAPA. Transições usam endpoints dedicados (/status,
  // /cancel, /reactivate). Se incluídos aqui com default, a updateLeadSchema
  // (=partial) herdava o default mesmo quando o cliente omitia o campo, o que
  // disparava o Guard 1 de updateLead. Ver spec §9.3 e plan §2.8.
  //
  // idKanban: removido em Task #22 — substituído pela entidade KanbanCard.
  // Qualquer request carregando esses campos tem o valor silenciosamente
  // descartado pelo Zod (comportamento padrão para unknown keys).
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
// Plan §4.4. Restringe a string a um dos quatro valores canônicos do enum
// LeadTemperatura — validação redundante com o domain, mas garante rejeição
// antes do service (melhor mensagem de erro e evita round-trip).

export const temperaturaSchema = z.object({
  temperatura: z.enum(
    ['Sem contato', 'Pouco interesse', 'Muito interesse', 'Sem interesse'],
    {
      message:
        'temperatura deve ser "Sem contato", "Pouco interesse", "Muito interesse" ou "Sem interesse".',
    },
  ),
});

// ─── Cancel (Task #11) ───────────────────────────────────────────────────
// Plan §4.2. Endpoint dedicado que exige motivo — reforça a diferença
// semântica entre "mudança de status qualquer" e "cancelamento" (que sempre
// exige justificativa auditável).

export const cancelLeadSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(1, 'motivo é obrigatório ao cancelar.')
    .max(1000),
});

// ─── Reativação (Task #12) ───────────────────────────────────────────────
// Plan §4.3 / spec §6.5. Usuário decide na UI:
//   - "reativar": restaura o Lead existente para o status anterior ao cancelamento
//   - "novo": preserva o Lead cancelado e cria um novo Lead vinculado ao mesmo Account

export const reactivateLeadSchema = z.object({
  modo: z.enum(['reativar', 'novo'], {
    message: 'modo deve ser "reativar" ou "novo".',
  }),
  motivo: z.string().trim().max(1000).optional().default(''),
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
