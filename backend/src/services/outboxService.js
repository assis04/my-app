/**
 * outboxService — fila persistente de side-effects externos.
 *
 * Fonte de verdade: specs/crm-plan.md §2.6
 *
 * Contrato:
 *   - enqueue() é chamado DENTRO da mesma transação da mutação de domínio
 *     (ex.: leadTransitionService). Isso garante que ou o side-effect será
 *     executado (fica na outbox), ou a mutação foi revertida (nada na outbox).
 *     Sem chance de "mudança aplicada mas side-effect perdido".
 *
 *   - O worker (Task #16) chama fetchPending() → processa → markDone() ou
 *     markFailed(). Retry com backoff até maxAttempts (default 5), depois o
 *     evento vira failed e exige intervenção manual.
 *
 * Status possíveis:
 *   pending  — aguardando processamento
 *   done     — processado com sucesso, processedAt preenchido
 *   failed   — excedeu maxAttempts, lastError preenchido
 */

import prisma from '../config/prisma.js';
import AppError from '../utils/AppError.js';

export const OutboxStatus = Object.freeze({
  PENDING: 'pending',
  DONE: 'done',
  FAILED: 'failed',
});

export const DEFAULT_MAX_ATTEMPTS = 5;

function assertNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppError(`${fieldName} deve ser string não-vazia.`, 400);
  }
}

function assertAggregateId(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new AppError('aggregateId deve ser inteiro positivo.', 400);
  }
  return n;
}

/**
 * Enfileira um intent na outbox. Chame de dentro de uma transação Prisma,
 * passando `tx` — isso garante atomicidade com a mutação de domínio.
 *
 * @param {object} params
 * @param {string} params.aggregate - domínio agregado (ex.: "lead")
 * @param {number} params.aggregateId - id do agregado
 * @param {string} params.eventType - tipo do intent (ex.: "agenda_open")
 * @param {object} [params.payload] - dados necessários pro worker processar
 * @param {object} [tx=prisma] - client da transação
 * @returns {Promise<object>} - registro da outbox criado
 */
export async function enqueue(params, tx = prisma) {
  if (!params || typeof params !== 'object') {
    throw new AppError('Parâmetros inválidos para outboxService.enqueue().', 400);
  }

  const { aggregate, aggregateId, eventType, payload = {} } = params;

  assertNonEmptyString(aggregate, 'aggregate');
  const aggregateIdInt = assertAggregateId(aggregateId);
  assertNonEmptyString(eventType, 'eventType');

  return tx.outbox.create({
    data: {
      aggregate,
      aggregateId: aggregateIdInt,
      eventType,
      payload,
      status: OutboxStatus.PENDING,
      attempts: 0,
    },
  });
}

/**
 * Busca eventos pendentes, ordem FIFO (createdAt ASC). Não usa SELECT FOR
 * UPDATE SKIP LOCKED ainda — single-worker por enquanto. Quando for
 * multi-worker, incluir SKIP LOCKED para evitar double-processing.
 *
 * @param {object} [opts]
 * @param {number} [opts.limit=10]
 * @returns {Promise<object[]>}
 */
export async function fetchPending({ limit = 10 } = {}) {
  const take = Math.min(100, Math.max(1, Number(limit) || 10));
  return prisma.outbox.findMany({
    where: { status: OutboxStatus.PENDING },
    orderBy: { createdAt: 'asc' },
    take,
  });
}

/**
 * Marca um evento como processado com sucesso.
 */
export async function markDone(id) {
  const idInt = Number(id);
  if (!Number.isInteger(idInt) || idInt <= 0) {
    throw new AppError('id deve ser inteiro positivo.', 400);
  }
  return prisma.outbox.update({
    where: { id: idInt },
    data: {
      status: OutboxStatus.DONE,
      processedAt: new Date(),
      lastError: null,
    },
  });
}

/**
 * Registra falha de processamento. Incrementa attempts e grava lastError.
 * Se attempts alcança maxAttempts, transiciona para status=failed (worker
 * não tentará de novo — exige intervenção manual).
 *
 * @param {number} id
 * @param {Error|string} error
 * @param {object} [opts]
 * @param {number} [opts.maxAttempts=DEFAULT_MAX_ATTEMPTS]
 * @returns {Promise<object>} - registro atualizado
 */
export async function markFailed(id, error, { maxAttempts = DEFAULT_MAX_ATTEMPTS } = {}) {
  const idInt = Number(id);
  if (!Number.isInteger(idInt) || idInt <= 0) {
    throw new AppError('id deve ser inteiro positivo.', 400);
  }

  const errorMessage = error instanceof Error
    ? `${error.name}: ${error.message}`
    : String(error ?? 'erro desconhecido');

  const current = await prisma.outbox.findUnique({ where: { id: idInt } });
  if (!current) throw new AppError('Evento da outbox não encontrado.', 404);

  const newAttempts = current.attempts + 1;
  const reachedLimit = newAttempts >= maxAttempts;

  return prisma.outbox.update({
    where: { id: idInt },
    data: {
      attempts: newAttempts,
      lastError: errorMessage.slice(0, 2000), // evita payloads absurdos
      status: reachedLimit ? OutboxStatus.FAILED : OutboxStatus.PENDING,
      // processedAt só é preenchido em markDone; failed não preenche
      // (mantém o createdAt para auditoria de "desde quando está travado")
    },
  });
}

/**
 * Fachada congelada — explicita a superfície pública da service.
 */
export const outboxService = Object.freeze({
  enqueue,
  fetchPending,
  markDone,
  markFailed,
  OutboxStatus,
});
