/**
 * Schemas reusáveis pro OpenAPI spec.
 *
 * Tem DUAS categorias de schemas no projeto:
 *  - Schemas de REQUEST: já existem em backend/src/validators/* (Zod) — fonte
 *    de verdade da validação. Importados nos paths/*.
 *  - Schemas de RESPONSE: definidos aqui. Não há outro lugar onde modelamos
 *    o shape do que o backend retorna; o serializer é o próprio Prisma + spread.
 *    Mantidos minimal mas precisos — incluem só campos que o controller
 *    realmente expõe.
 *
 * Convenção: registrar com `.openapi('Nome')` pro nome aparecer como
 * `#/components/schemas/Nome` no spec final.
 */
import './init.js';
import { z } from 'zod';

// ─── Primitives e helpers ─────────────────────────────────────────────────

export const ErrorResponse = z
  .object({
    message: z.string().openapi({ example: 'Acesso negado.' }),
  })
  .openapi('ErrorResponse', { description: 'Resposta de erro padrão.' });

export const ZodErrorIssue = z
  .object({
    code: z.string(),
    path: z.array(z.union([z.string(), z.number()])),
    message: z.string(),
  })
  .openapi('ZodErrorIssue');

export const ValidationErrorResponse = z
  .object({
    message: z.string().openapi({ example: 'Erro de validação' }),
    errors: z.array(ZodErrorIssue),
  })
  .openapi('ValidationErrorResponse');

// ─── User (vínculo simplificado nas relações) ─────────────────────────────

export const UserSummary = z
  .object({
    id: z.number().int(),
    nome: z.string(),
    email: z.string().email().optional(),
  })
  .openapi('UserSummary');

// ─── Account (Conta/Pessoa) ───────────────────────────────────────────────

export const Account = z
  .object({
    id: z.number().int(),
    nome: z.string(),
    sobrenome: z.string().nullable(),
    celular: z.string(),
    cep: z.string().nullable(),
    filialId: z.number().int().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi('Account', { description: 'Conta/Pessoa — agregador de Leads.' });

// ─── Lead ─────────────────────────────────────────────────────────────────

export const LeadStatus = z
  .enum([
    'Em prospecção',
    'Aguardando Planta/medidas',
    'Agendado vídeo chamada',
    'Agendado visita',
    'Em atendimento na loja',
    'Venda',
    'Pós-venda',
    'Cancelado',
  ])
  .openapi('LeadStatus', { description: '8 estados canônicos do funil.' });

export const LeadEtapa = z
  .enum(['Prospecção', 'Negociação', 'Venda', 'Pós-venda', 'Cancelados'])
  .openapi('LeadEtapa', { description: 'Etapa derivada do status (read-only).' });

export const LeadTemperatura = z
  .enum(['Sem contato', 'Pouco interesse', 'Muito interesse', 'Sem interesse'])
  .openapi('LeadTemperatura');

export const Lead = z
  .object({
    id: z.number().int(),
    nome: z.string(),
    sobrenome: z.string().nullable(),
    celular: z.string(),
    cep: z.string().nullable(),
    email: z.string().email().nullable().optional(),
    status: LeadStatus,
    etapa: LeadEtapa.nullable(),
    temperatura: LeadTemperatura.nullable(),
    statusAntesCancelamento: LeadStatus.nullable().optional(),
    canceladoEm: z.string().datetime().nullable().optional(),
    motivoCancelamento: z.string().nullable().optional(),
    origemCanal: z.string().nullable().optional(),
    origemExterna: z.boolean().optional(),
    contaId: z.number().int(),
    filialId: z.number().int().nullable(),
    preVendedorId: z.number().int().nullable(),
    preVendedor: UserSummary.nullable().optional(),
    conta: Account.nullable().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi('Lead', { description: 'Lead do CRM (entidade principal do funil).' });

// ─── KanbanCard (referência usada em transitions) ─────────────────────────

export const KanbanCard = z
  .object({
    id: z.number().int(),
    leadId: z.number().int(),
    coluna: z.string(),
    posicao: z.number(),
  })
  .openapi('KanbanCard');

// ─── LeadHistoryEvent ─────────────────────────────────────────────────────

export const LeadHistoryEvent = z
  .object({
    id: z.number().int(),
    leadId: z.number().int(),
    eventType: z.string(),
    payload: z.record(z.string(), z.unknown()).nullable().optional(),
    authorUserId: z.number().int().nullable(),
    authorUser: UserSummary.nullable().optional(),
    createdAt: z.string().datetime(),
  })
  .openapi('LeadHistoryEvent');

// ─── Orçamento ────────────────────────────────────────────────────────────

export const OrcamentoStatus = z
  .enum(['Nova O.N.', 'Não Responde', 'Standby', 'Cancelado'])
  .openapi('OrcamentoStatus');

export const Orcamento = z
  .object({
    id: z.number().int(),
    leadId: z.number().int(),
    status: OrcamentoStatus,
    motivoCancelamento: z.string().nullable().optional(),
    canceladoEm: z.string().datetime().nullable().optional(),
    criadoPorUserId: z.number().int().nullable(),
    criadoPor: UserSummary.nullable().optional(),
    lead: Lead.nullable().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi('Orcamento', {
    description: 'Orçamento (N.O.N.) — vinculado 1:1 ao Lead.',
  });

// ─── Wrappers de paginação e transição ────────────────────────────────────

export function paginatedResponse(itemSchema, name) {
  return z
    .object({
      data: z.array(itemSchema),
      total: z.number().int(),
      page: z.number().int(),
      limit: z.number().int(),
      totalPages: z.number().int(),
    })
    .openapi(name);
}

export const LeadTransitionResponse = z
  .object({
    lead: Lead,
    kanbanCard: KanbanCard.nullable().optional(),
    historyEvent: LeadHistoryEvent.nullable(),
    outboxEvents: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .openapi('LeadTransitionResponse');

export const TemperaturaResponse = z
  .object({
    lead: Lead,
    historyEvent: LeadHistoryEvent.nullable(),
    changed: z.boolean(),
  })
  .openapi('TemperaturaResponse');

export const LeadHistoryPage = z
  .object({
    items: z.array(LeadHistoryEvent),
    nextCursor: z.string().nullable(),
  })
  .openapi('LeadHistoryPage');
