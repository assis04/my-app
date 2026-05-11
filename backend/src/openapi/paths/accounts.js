/**
 * Paths CRM — Accounts (Conta/Pessoa). Somente leitura — criação acontece
 * implicitamente no fluxo de Lead (match por celular).
 */
import '../init.js';
import { z } from 'zod';
import {
  Account,
  Lead,
  ErrorResponse,
  paginatedResponse,
} from '../schemas.js';

const TAG = 'Accounts';
const BASE = '/api/crm/accounts';
const security = [{ bearerAuth: [] }];

const AccountWithLeads = Account.extend({
  leads: z.array(Lead),
}).openapi('AccountWithLeads');

const AccountsPage = paginatedResponse(Account, 'AccountsPage');

const idParam = z.object({ id: z.string().regex(/^\d+$/) });

export function registerAccountPaths(registry) {
  registry.registerPath({
    method: 'get',
    path: BASE,
    summary: 'Lista contas (paginado, filtros amplos)',
    description: 'Filtros aceitos: search, nome, telefone, status, filialId, userId, dataInicio, dataFim.',
    tags: [TAG],
    security,
    request: {
      query: z.object({
        search: z.string().optional(),
        nome: z.string().optional(),
        telefone: z.string().optional(),
        status: z.string().optional(),
        filialId: z.string().optional(),
        userId: z.string().optional(),
        dataInicio: z.string().datetime({ offset: true }).optional(),
        dataFim: z.string().datetime({ offset: true }).optional(),
      }),
    },
    responses: {
      200: { description: 'Página de contas', content: { 'application/json': { schema: AccountsPage } } },
      401: { description: 'Não autenticado', content: { 'application/json': { schema: ErrorResponse } } },
      403: { description: 'Sem permissão', content: { 'application/json': { schema: ErrorResponse } } },
    },
  });

  registry.registerPath({
    method: 'get',
    path: `${BASE}/{id}`,
    summary: 'Detalhe de uma conta com todos os leads',
    tags: [TAG],
    security,
    request: { params: idParam },
    responses: {
      200: { description: 'Conta com leads', content: { 'application/json': { schema: AccountWithLeads } } },
      401: { description: 'Não autenticado', content: { 'application/json': { schema: ErrorResponse } } },
      403: { description: 'Sem permissão', content: { 'application/json': { schema: ErrorResponse } } },
      404: { description: 'Conta não encontrada', content: { 'application/json': { schema: ErrorResponse } } },
    },
  });
}
