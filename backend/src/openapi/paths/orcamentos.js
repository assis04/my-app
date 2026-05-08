/**
 * Paths CRM — Orçamentos (N.O.N.). Entidade dedicada vinculada 1:1 ao Lead.
 */
import '../init.js';
import { z } from 'zod';
import {
  createOrcamentoSchema,
  transitionOrcamentoSchema,
  cancelOrcamentoSchema,
  reactivateOrcamentoSchema,
} from '../../validators/orcamentoValidator.js';
import {
  Orcamento,
  ErrorResponse,
  ValidationErrorResponse,
  paginatedResponse,
} from '../schemas.js';

const TAG = 'Orçamentos';
const BASE = '/api/crm/orcamentos';
const security = [{ bearerAuth: [] }];

const OrcamentosPage = paginatedResponse(Orcamento, 'OrcamentosPage');

const idParam = z.object({ id: z.string().regex(/^\d+$/) });
const leadIdParam = z.object({ leadId: z.string().regex(/^\d+$/) });

const errorResponses = {
  400: { description: 'Erro de validação', content: { 'application/json': { schema: ValidationErrorResponse } } },
  401: { description: 'Não autenticado', content: { 'application/json': { schema: ErrorResponse } } },
  403: { description: 'Sem permissão', content: { 'application/json': { schema: ErrorResponse } } },
  404: { description: 'Orçamento não encontrado', content: { 'application/json': { schema: ErrorResponse } } },
};

export function registerOrcamentoPaths(registry) {
  registry.registerPath({
    method: 'get',
    path: BASE,
    summary: 'Lista orçamentos (paginado)',
    tags: [TAG],
    security,
    request: {
      query: z.object({
        search: z.string().optional(),
        status: z.string().optional(),
        filialId: z.string().optional(),
        userId: z.string().optional(),
        dataInicio: z.string().datetime({ offset: true }).optional(),
        dataFim: z.string().datetime({ offset: true }).optional(),
        page: z.string().optional(),
        limit: z.string().optional(),
      }),
    },
    responses: {
      200: { description: 'Página de orçamentos', content: { 'application/json': { schema: OrcamentosPage } } },
      401: errorResponses[401],
      403: errorResponses[403],
    },
  });

  registry.registerPath({
    method: 'post',
    path: BASE,
    summary: 'Cria orçamento vinculado a um lead',
    description: 'Backend força status inicial "Nova O.N.". Lead deve existir e não ter orçamento ativo.',
    tags: [TAG],
    security,
    request: { body: { content: { 'application/json': { schema: createOrcamentoSchema } } } },
    responses: {
      201: { description: 'Orçamento criado', content: { 'application/json': { schema: Orcamento } } },
      400: errorResponses[400],
      401: errorResponses[401],
      403: errorResponses[403],
    },
  });

  registry.registerPath({
    method: 'get',
    path: `${BASE}/{id}`,
    summary: 'Detalhe de orçamento (inclui lead + criadoPor)',
    tags: [TAG],
    security,
    request: { params: idParam },
    responses: {
      200: { description: 'Orçamento', content: { 'application/json': { schema: Orcamento } } },
      ...errorResponses,
    },
  });

  registry.registerPath({
    method: 'put',
    path: `${BASE}/{id}/status`,
    summary: 'Transita status (apenas entre não-terminais)',
    description: 'Para Cancelado, use /cancel. Para reativar, use /reactivate.',
    tags: [TAG],
    security,
    request: {
      params: idParam,
      body: { content: { 'application/json': { schema: transitionOrcamentoSchema } } },
    },
    responses: {
      200: { description: 'Atualizado', content: { 'application/json': { schema: Orcamento } } },
      ...errorResponses,
    },
  });

  registry.registerPath({
    method: 'put',
    path: `${BASE}/{id}/cancel`,
    summary: 'Cancela orçamento (motivo enumerado obrigatório)',
    tags: [TAG],
    security,
    request: {
      params: idParam,
      body: { content: { 'application/json': { schema: cancelOrcamentoSchema } } },
    },
    responses: {
      200: { description: 'Cancelado', content: { 'application/json': { schema: Orcamento } } },
      ...errorResponses,
    },
  });

  registry.registerPath({
    method: 'put',
    path: `${BASE}/{id}/reactivate`,
    summary: 'Reativa orçamento cancelado (volta para Nova O.N.)',
    tags: [TAG],
    security,
    request: {
      params: idParam,
      body: { content: { 'application/json': { schema: reactivateOrcamentoSchema } } },
    },
    responses: {
      200: { description: 'Reativado', content: { 'application/json': { schema: Orcamento } } },
      ...errorResponses,
    },
  });

  // Shortcut: get by leadId
  registry.registerPath({
    method: 'get',
    path: '/api/crm/leads/{leadId}/orcamento',
    summary: 'Orçamento vinculado ao lead (shortcut)',
    description: 'Retorna 404 se o lead não tem orçamento.',
    tags: [TAG],
    security,
    request: { params: leadIdParam },
    responses: {
      200: { description: 'Orçamento do lead', content: { 'application/json': { schema: Orcamento } } },
      ...errorResponses,
    },
  });
}
