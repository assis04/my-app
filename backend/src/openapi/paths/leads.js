/**
 * Paths CRM — Leads (entidade principal). Documenta as 13 rotas
 * de /api/crm/leads.
 *
 * Convenção:
 *  - request schemas reutilizam validators existentes (fonte de verdade)
 *  - response schemas vêm de openapi/schemas.js
 *  - todas as rotas exigem bearerAuth (cookie/JWT)
 */
import '../init.js';
import { z } from 'zod';

import {
  createLeadSchema,
  updateLeadSchema,
  transitionStatusSchema,
  temperaturaSchema,
  cancelLeadSchema,
  reactivateLeadSchema,
  transferLeadsSchema,
  updateEtapaSchema,
} from '../../validators/leadValidator.js';

import {
  Lead,
  LeadStatus,
  ErrorResponse,
  ValidationErrorResponse,
  LeadHistoryPage,
  LeadTransitionResponse,
  TemperaturaResponse,
  paginatedResponse,
} from '../schemas.js';

const TAG = 'Leads';
const BASE = '/api/crm/leads';

const LeadsPage = paginatedResponse(Lead, 'LeadsPage');

const idParam = z.object({ id: z.string().regex(/^\d+$/).openapi({ example: '42' }) });

const errorResponses = {
  400: { description: 'Erro de validação', content: { 'application/json': { schema: ValidationErrorResponse } } },
  401: { description: 'Não autenticado', content: { 'application/json': { schema: ErrorResponse } } },
  403: { description: 'Sem permissão', content: { 'application/json': { schema: ErrorResponse } } },
  404: { description: 'Lead não encontrado', content: { 'application/json': { schema: ErrorResponse } } },
};

const security = [{ bearerAuth: [] }];

export function registerLeadPaths(registry) {
  // ── List ────────────────────────────────────────────────────────────────
  registry.registerPath({
    method: 'get',
    path: BASE,
    summary: 'Lista leads (paginado, filtráveis)',
    tags: [TAG],
    security,
    request: {
      query: z.object({
        search: z.string().optional().openapi({ description: 'Busca em nome, sobrenome, celular, CEP, conta.nome' }),
        status: LeadStatus.optional(),
        pre_vendedor_id: z.string().optional(),
        page: z.string().optional().openapi({ example: '1' }),
        limit: z.string().optional().openapi({ example: '50' }),
        sort_by: z.enum(['createdAt', 'nome', 'status', 'temperatura']).optional(),
        sort_dir: z.enum(['asc', 'desc']).optional(),
      }),
    },
    responses: {
      200: { description: 'Página de leads', content: { 'application/json': { schema: LeadsPage } } },
      401: errorResponses[401],
      403: errorResponses[403],
    },
  });

  // ── Create ──────────────────────────────────────────────────────────────
  registry.registerPath({
    method: 'post',
    path: BASE,
    summary: 'Cria um lead novo',
    description:
      'Backend força status canônico "Em prospecção" e deriva etapa via STATUS_TO_ETAPA. ' +
      'A vinculação com Conta acontece automaticamente (match por celular).',
    tags: [TAG],
    security,
    request: { body: { content: { 'application/json': { schema: createLeadSchema } } } },
    responses: {
      201: { description: 'Lead criado', content: { 'application/json': { schema: Lead } } },
      400: errorResponses[400],
      401: errorResponses[401],
      403: errorResponses[403],
    },
  });

  // ── Get by id ───────────────────────────────────────────────────────────
  registry.registerPath({
    method: 'get',
    path: `${BASE}/{id}`,
    summary: 'Detalhe do lead com Kanban e últimos 20 eventos',
    tags: [TAG],
    security,
    request: { params: idParam },
    responses: {
      200: { description: 'Lead', content: { 'application/json': { schema: Lead } } },
      401: errorResponses[401],
      403: errorResponses[403],
      404: errorResponses[404],
    },
  });

  // ── Update ──────────────────────────────────────────────────────────────
  registry.registerPath({
    method: 'put',
    path: `${BASE}/{id}`,
    summary: 'Atualiza dados do lead',
    description:
      'Não aceita mudança de status/etapa/temperatura — use endpoints dedicados ' +
      '(/status, /temperatura, /cancel, /reactivate).',
    tags: [TAG],
    security,
    request: {
      params: idParam,
      body: { content: { 'application/json': { schema: updateLeadSchema } } },
    },
    responses: {
      200: { description: 'Lead atualizado', content: { 'application/json': { schema: Lead } } },
      ...errorResponses,
    },
  });

  // ── Delete ──────────────────────────────────────────────────────────────
  registry.registerPath({
    method: 'delete',
    path: `${BASE}/{id}`,
    summary: 'Soft-delete do lead',
    tags: [TAG],
    security,
    request: { params: idParam },
    responses: {
      204: { description: 'Removido' },
      401: errorResponses[401],
      403: errorResponses[403],
      404: errorResponses[404],
    },
  });

  // ── Transition status ──────────────────────────────────────────────────
  registry.registerPath({
    method: 'put',
    path: `${BASE}/{id}/status`,
    summary: 'Transita status via state machine',
    description:
      'Valida transição via statusMachine. Status que requerem agendamento ' +
      'esperam contexto.agendadoPara (ISO 8601 com offset).',
    tags: [TAG],
    security,
    request: {
      params: idParam,
      body: { content: { 'application/json': { schema: transitionStatusSchema } } },
    },
    responses: {
      200: { description: 'Transição aplicada', content: { 'application/json': { schema: LeadTransitionResponse } } },
      ...errorResponses,
    },
  });

  // ── Set temperatura ────────────────────────────────────────────────────
  registry.registerPath({
    method: 'put',
    path: `${BASE}/{id}/temperatura`,
    summary: 'Atualiza temperatura do lead',
    description: '`changed=false` quando o valor é igual ao atual (no-op idempotente).',
    tags: [TAG],
    security,
    request: {
      params: idParam,
      body: { content: { 'application/json': { schema: temperaturaSchema } } },
    },
    responses: {
      200: { description: 'OK', content: { 'application/json': { schema: TemperaturaResponse } } },
      ...errorResponses,
    },
  });

  // ── Cancel ─────────────────────────────────────────────────────────────
  registry.registerPath({
    method: 'put',
    path: `${BASE}/{id}/cancel`,
    summary: 'Cancela lead (motivo obrigatório)',
    tags: [TAG],
    security,
    request: {
      params: idParam,
      body: { content: { 'application/json': { schema: cancelLeadSchema } } },
    },
    responses: {
      200: { description: 'Cancelado', content: { 'application/json': { schema: LeadTransitionResponse } } },
      ...errorResponses,
    },
  });

  // ── Reactivate ─────────────────────────────────────────────────────────
  registry.registerPath({
    method: 'put',
    path: `${BASE}/{id}/reactivate`,
    summary: 'Reativa lead cancelado',
    description:
      'modo="reativar": restaura para status anterior (200). ' +
      'modo="novo": cria novo lead vinculado à mesma Account (201).',
    tags: [TAG],
    security,
    request: {
      params: idParam,
      body: { content: { 'application/json': { schema: reactivateLeadSchema } } },
    },
    responses: {
      200: { description: 'Reativado (modo=reativar)', content: { 'application/json': { schema: LeadTransitionResponse } } },
      201: { description: 'Novo lead criado (modo=novo)', content: { 'application/json': { schema: Lead } } },
      ...errorResponses,
    },
  });

  // ── History ────────────────────────────────────────────────────────────
  registry.registerPath({
    method: 'get',
    path: `${BASE}/{id}/history`,
    summary: 'Histórico paginado de eventos do lead',
    tags: [TAG],
    security,
    request: {
      params: idParam,
      query: z.object({
        cursor: z.string().optional(),
        limit: z.string().optional(),
      }),
    },
    responses: {
      200: { description: 'Página de histórico', content: { 'application/json': { schema: LeadHistoryPage } } },
      401: errorResponses[401],
      403: errorResponses[403],
      404: errorResponses[404],
    },
  });

  // ── Get planta (PDF/image) ─────────────────────────────────────────────
  registry.registerPath({
    method: 'get',
    path: `${BASE}/{id}/planta`,
    summary: 'Download da planta anexada ao lead',
    description: 'Valida ownership + path traversal. Content-Disposition derivado do leadId.',
    tags: [TAG],
    security,
    request: { params: idParam },
    responses: {
      200: {
        description: 'Arquivo binário',
        content: { 'application/octet-stream': { schema: z.string().openapi({ format: 'binary' }) } },
      },
      401: errorResponses[401],
      403: errorResponses[403],
      404: errorResponses[404],
    },
  });

  // ── Bulk: transferir ───────────────────────────────────────────────────
  registry.registerPath({
    method: 'put',
    path: '/api/crm/leads-transfer',
    summary: 'Transfere múltiplos leads para um pré-vendedor',
    tags: [TAG],
    security,
    request: { body: { content: { 'application/json': { schema: transferLeadsSchema } } } },
    responses: {
      200: { description: 'Quantidade transferida', content: { 'application/json': { schema: z.object({ count: z.number().int() }) } } },
      400: errorResponses[400],
      401: errorResponses[401],
      403: errorResponses[403],
    },
  });

  // ── Bulk: definir etapa ────────────────────────────────────────────────
  registry.registerPath({
    method: 'put',
    path: '/api/crm/leads-etapa',
    summary: 'Define etapa para múltiplos leads (legado)',
    tags: [TAG],
    security,
    request: { body: { content: { 'application/json': { schema: updateEtapaSchema } } } },
    responses: {
      200: { description: 'Quantidade atualizada', content: { 'application/json': { schema: z.object({ count: z.number().int() }) } } },
      400: errorResponses[400],
      401: errorResponses[401],
      403: errorResponses[403],
    },
  });
}
