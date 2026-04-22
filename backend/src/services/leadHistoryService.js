/**
 * leadHistoryService — wrapper append-only sobre a tabela lead_history.
 *
 * Contrato:
 *   - Expõe APENAS add() e listByLead()/listByLeadPaginated()
 *   - NÃO expõe update(), delete(), nem qualquer função que mute eventos existentes
 *   - add() aceita um `tx` opcional para participar de transações do orquestrador
 *     (leadTransitionService — Task #8) sem abrir transação própria
 *
 * Fonte de verdade: specs/crm.md §4.4 / specs/crm-plan.md §2.4
 */

import prisma from '../config/prisma.js';
import AppError from '../utils/AppError.js';
import {
  isValidEventType,
  getRequiredPayloadKeys,
} from '../domain/leadEvents.js';

function assertLeadId(leadId) {
  const asInt = Number(leadId);
  if (!Number.isInteger(asInt) || asInt <= 0) {
    throw new AppError('leadId deve ser um inteiro positivo.', 400);
  }
  return asInt;
}

function assertPayloadShape(eventType, payload) {
  const required = getRequiredPayloadKeys(eventType);
  if (required.length === 0) return;

  const obj = payload ?? {};
  const missing = required.filter((key) => !(key in obj));
  if (missing.length > 0) {
    throw new AppError(
      `Payload inválido para evento "${eventType}": chaves obrigatórias ausentes [${missing.join(', ')}]`,
      400,
    );
  }
}

/**
 * Insere um evento no histórico de um Lead. Operação append-only.
 *
 * @param {object} params
 * @param {number} params.leadId - FK obrigatória para o Lead
 * @param {number|null} [params.authorUserId] - autor humano; null se sistema/webhook
 * @param {string} params.eventType - um dos LeadEventType (validado)
 * @param {object} [params.payload] - shape por tipo em domain/leadEvents.js PAYLOAD_SHAPES
 * @param {object} [tx] - client Prisma para participar de transação externa
 * @returns {Promise<object>} o evento criado
 */
export async function add(params, tx = prisma) {
  if (!params || typeof params !== 'object') {
    throw new AppError('Parâmetros inválidos para leadHistoryService.add().', 400);
  }

  const { leadId, authorUserId = null, eventType, payload = {} } = params;

  const leadIdInt = assertLeadId(leadId);

  if (!isValidEventType(eventType)) {
    throw new AppError(`Tipo de evento inválido: "${eventType}"`, 400);
  }

  assertPayloadShape(eventType, payload);

  return tx.leadHistory.create({
    data: {
      leadId: leadIdInt,
      authorUserId: authorUserId ?? null,
      eventType,
      payload,
    },
  });
}

const LIST_LIMIT_DEFAULT = 50;
const LIST_LIMIT_MAX = 200;

function clampLimit(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return LIST_LIMIT_DEFAULT;
  return Math.min(LIST_LIMIT_MAX, Math.max(1, Math.floor(n)));
}

/**
 * Lista os eventos de um Lead em ordem cronológica descendente (mais recente primeiro).
 * Sem paginação — use listByLeadPaginated() para timelines longas.
 */
export async function listByLead(leadId, { limit = LIST_LIMIT_DEFAULT } = {}) {
  const leadIdInt = assertLeadId(leadId);

  return prisma.leadHistory.findMany({
    where: { leadId: leadIdInt },
    orderBy: { createdAt: 'desc' },
    take: clampLimit(limit),
    include: {
      authorUser: { select: { id: true, nome: true } },
    },
  });
}

/**
 * Listagem paginada por cursor (id do último item da página anterior).
 *
 * @param {number|string} leadId
 * @param {object} [opts]
 * @param {number} [opts.cursor] - id do último evento da página anterior
 * @param {number} [opts.limit=50] - tamanho da página (1..200)
 * @returns {Promise<{ items: object[], nextCursor: number|null }>}
 */
export async function listByLeadPaginated(leadId, { cursor, limit = LIST_LIMIT_DEFAULT } = {}) {
  const leadIdInt = assertLeadId(leadId);
  const take = clampLimit(limit);

  const query = {
    where: { leadId: leadIdInt },
    orderBy: { createdAt: 'desc' },
    // +1 pra detectar se há próxima página sem segunda query
    take: take + 1,
    include: {
      authorUser: { select: { id: true, nome: true } },
    },
  };

  if (cursor) {
    const cursorInt = Number(cursor);
    if (!Number.isInteger(cursorInt) || cursorInt <= 0) {
      throw new AppError('cursor deve ser um inteiro positivo.', 400);
    }
    query.cursor = { id: cursorInt };
    query.skip = 1;
  }

  const rows = await prisma.leadHistory.findMany(query);

  const hasMore = rows.length > take;
  const items = hasMore ? rows.slice(0, take) : rows;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return { items, nextCursor };
}

/**
 * Fachada congelada — expõe exatamente a superfície de API permitida.
 * Qualquer tentativa de adicionar update/delete aqui falha em tempo de execução.
 */
export const leadHistoryService = Object.freeze({
  add,
  listByLead,
  listByLeadPaginated,
});
