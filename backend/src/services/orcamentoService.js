/**
 * orcamentoService — CRUD + orquestração transacional de Orçamentos (N.O.N.).
 *
 * Fonte de verdade: specs/crm-non.md | Plan: validated-swimming-otter.md
 *
 * Responsabilidades:
 *   - createOrcamento: cria Orçamento vinculado a um Lead (1:1 estrito via FK)
 *   - getOrcamentoById / getOrcamentoByLeadId: lookups com filial isolation
 *   - listOrcamentos: listagem paginada (refator de crmService.getAllOrcamentos)
 *   - transitionOrcamentoStatus / cancelOrcamento / reactivateOrcamento:
 *     mutações validadas via orcamentoStatusMachine + LeadHistory
 *
 * V1 não tem side-effects automáticos — vendedor controla tudo manualmente.
 */

import prisma from '../config/prisma.js';
import AppError from '../utils/AppError.js';
import { Prisma } from '@prisma/client';
import {
  OrcamentoStatus,
  INITIAL_STATUS,
  isValidMotivoCancelamento,
} from '../domain/orcamentoStatus.js';
import { validateTransition } from './orcamentoStatusMachine.js';
import { LeadEventType } from '../domain/leadEvents.js';
import { LeadStatus } from '../domain/leadStatus.js';
import { add as addHistoryEvent } from './leadHistoryService.js';

// ─── Helpers ───────────────────────────────────────────────────────────────

function isAdm(user) {
  return user?.role === 'ADM' || user?.permissions?.includes('*');
}

function assertFilialAccess(lead, user) {
  if (isAdm(user)) return;
  if (user?.filialId && lead.filialId && lead.filialId !== user.filialId) {
    throw new AppError('Acesso negado: recurso de outra filial.', 403);
  }
}

function assertLeadId(value) {
  const asInt = Number(value);
  if (!Number.isInteger(asInt) || asInt <= 0) {
    throw new AppError('leadId deve ser um inteiro positivo.', 400);
  }
  return asInt;
}

function assertOrcamentoId(value) {
  const asInt = Number(value);
  if (!Number.isInteger(asInt) || asInt <= 0) {
    throw new AppError('orcamentoId deve ser um inteiro positivo.', 400);
  }
  return asInt;
}

/**
 * Gera um número sequencial para o Orçamento no formato "NON-YYYY-NNNNNN".
 * Usa count do ano corrente + 1; colisão é evitada pelo @unique no numero,
 * com retry único em P2002.
 */
async function generateNumero(tx) {
  const ano = new Date().getFullYear();
  const startOfYear = new Date(`${ano}-01-01T00:00:00.000Z`);
  const count = await tx.orcamento.count({
    where: { createdAt: { gte: startOfYear } },
  });
  const seq = String(count + 1).padStart(6, '0');
  return `NON-${ano}-${seq}`;
}

// ─── Create ────────────────────────────────────────────────────────────────

/**
 * Cria um Orçamento vinculado a um Lead.
 * Bloqueia criação se:
 *  - Lead não existe ou foi soft-deleted
 *  - Lead está em Cancelado (exige reativar o Lead primeiro)
 *  - Já existe Orçamento vinculado (unique FK — retorna 409 com link)
 *
 * @param {object} params
 * @param {number} params.leadId
 * @param {object} params.user
 * @returns {Promise<object>} Orçamento recém-criado (sem includes)
 */
export async function createOrcamento({ leadId, user }) {
  const leadIdInt = assertLeadId(leadId);
  if (!user?.id) throw new AppError('Usuário autenticado é obrigatório.', 401);

  return prisma.$transaction(async (tx) => {
    // 1. Lock do Lead pra evitar race com cancel/reactivate concorrente
    await tx.$executeRaw`SELECT id FROM leads WHERE id = ${leadIdInt} FOR UPDATE`;

    // 2. Carrega + valida Lead
    const lead = await tx.lead.findFirst({
      where: { id: leadIdInt, deletedAt: null },
      include: { orcamento: true },
    });
    if (!lead) throw new AppError('Lead não encontrado.', 404);

    assertFilialAccess(lead, user);

    if (lead.status === LeadStatus.CANCELADO) {
      throw new AppError(
        'Lead em Cancelado não aceita novo Orçamento. Reative o Lead primeiro.',
        409,
      );
    }

    // 3. Guard anti-duplicação (mensagem amigável antes do P2002 bater)
    if (lead.orcamento) {
      throw new AppError(
        `Lead já possui Orçamento vinculado (${lead.orcamento.numero}).`,
        409,
      );
    }

    // 4. Gera numero + insere. Retry único em P2002 (colisão de numero).
    let attempts = 0;
    let numero;
    while (attempts < 2) {
      numero = await generateNumero(tx);
      try {
        const created = await tx.orcamento.create({
          data: {
            numero,
            leadId: leadIdInt,
            status: INITIAL_STATUS,
            criadoPorUserId: user.id,
          },
        });

        await addHistoryEvent(
          {
            leadId: leadIdInt,
            authorUserId: user.id,
            eventType: LeadEventType.NON_GENERATED,
            payload: { orcamentoId: created.id, numero: created.numero },
          },
          tx,
        );

        return created;
      } catch (err) {
        if (err?.code === 'P2002') {
          const target = err?.meta?.target;
          if (Array.isArray(target) && target.includes('leadId')) {
            // Double-check race: outro request criou entre o findFirst e o create
            throw new AppError('Lead já possui Orçamento vinculado.', 409);
          }
          if (Array.isArray(target) && target.includes('numero')) {
            attempts += 1;
            continue; // retry com novo numero
          }
        }
        throw err;
      }
    }
    throw new AppError('Não foi possível gerar um número único para o Orçamento.', 500);
  });
}

// ─── Read ──────────────────────────────────────────────────────────────────

export async function getOrcamentoById(id, user) {
  const idInt = assertOrcamentoId(id);
  const orcamento = await prisma.orcamento.findFirst({
    where: { id: idInt },
    include: {
      lead: {
        include: {
          vendedor: { select: { id: true, nome: true } },
          preVendedor: { select: { id: true, nome: true } },
          filial: { select: { id: true, nome: true } },
          conta: true,
        },
      },
      criadoPor: { select: { id: true, nome: true } },
    },
  });
  if (!orcamento) throw new AppError('Orçamento não encontrado.', 404);
  assertFilialAccess(orcamento.lead, user);
  return orcamento;
}

export async function getOrcamentoByLeadId(leadId, user) {
  const leadIdInt = assertLeadId(leadId);
  const orcamento = await prisma.orcamento.findFirst({
    where: { leadId: leadIdInt },
    include: {
      lead: { select: { id: true, filialId: true, nome: true, status: true } },
      criadoPor: { select: { id: true, nome: true } },
    },
  });
  if (!orcamento) return null;
  assertFilialAccess(orcamento.lead, user);
  return orcamento;
}

// ─── List (refator do crmService.getAllOrcamentos) ─────────────────────────

/**
 * Whitelist de campos sortáveis. Cada campo precisa estar indexado no DB
 * (ver schema.prisma — orcamentos tem index em status e createdAt).
 * `numero` é único + não tem index dedicado, mas é texto curto e cardinalidade
 * baixa em queries paginadas.
 */
const SORTABLE_FIELDS = Object.freeze(['createdAt', 'numero', 'status']);

/**
 * Lista Orçamentos com filtros. Filtros aceitos:
 *   - nome (lead.nome contains, case-insensitive)
 *   - telefone (lead.celular contains)
 *   - status (orcamento.status exato)
 *   - filialId (lead.filialId)
 *   - userId (lead.vendedorId)
 *   - dataInicio / dataFim (orcamento.createdAt)
 *   - page, limit
 *   - sortBy (whitelist em SORTABLE_FIELDS), sortDir ('asc' | 'desc')
 *
 * Scoping por filial: não-ADM só vê Orçamentos de leads da sua filial.
 */
export async function listOrcamentos(filters = {}, user) {
  const {
    nome,
    telefone,
    status,
    filialId,
    userId,
    dataInicio,
    dataFim,
    page = 1,
    limit = 50,
    sortBy,
    sortDir,
  } = filters;

  const pageInt = Math.max(1, parseInt(page, 10) || 1);
  const limitInt = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

  const leadWhere = {};
  if (nome) leadWhere.nome = { contains: nome, mode: 'insensitive' };
  if (telefone) leadWhere.celular = { contains: telefone };
  if (!isAdm(user) && user?.filialId) {
    leadWhere.filialId = user.filialId;
  } else if (filialId) {
    leadWhere.filialId = parseInt(filialId, 10);
  }
  if (userId) leadWhere.vendedorId = parseInt(userId, 10);

  const where = {};
  if (status) where.status = status;
  if (Object.keys(leadWhere).length > 0) {
    where.lead = leadWhere;
  }

  if (dataInicio || dataFim) {
    where.createdAt = {};
    if (dataInicio) where.createdAt.gte = new Date(dataInicio);
    if (dataFim) where.createdAt.lte = new Date(dataFim);
  }

  // Resolução do orderBy com fallback silencioso em input inválido — mesmo
  // padrão de Leads (whitelist + default createdAt desc).
  const safeField = SORTABLE_FIELDS.includes(sortBy) ? sortBy : 'createdAt';
  const safeDir = sortDir === 'asc' ? 'asc' : 'desc';
  const orderBy = { [safeField]: safeDir };

  const [data, total] = await prisma.$transaction([
    prisma.orcamento.findMany({
      where,
      include: {
        lead: {
          include: {
            vendedor: { select: { id: true, nome: true } },
            filial: { select: { id: true, nome: true } },
          },
        },
        criadoPor: { select: { id: true, nome: true } },
      },
      orderBy,
      skip: (pageInt - 1) * limitInt,
      take: limitInt,
    }),
    prisma.orcamento.count({ where }),
  ]);

  return {
    data,
    total,
    page: pageInt,
    limit: limitInt,
    totalPages: Math.max(1, Math.ceil(total / limitInt)),
  };
}

// ─── Transitions ───────────────────────────────────────────────────────────

/**
 * Transição simples via endpoint /status (entre Nova O.N., Não Responde, Standby).
 */
export async function transitionOrcamentoStatus({ id, newStatus, user }) {
  const idInt = assertOrcamentoId(id);
  if (!user?.id) throw new AppError('Usuário autenticado é obrigatório.', 401);

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM orcamentos WHERE id = ${idInt} FOR UPDATE`;

    const orcamento = await tx.orcamento.findFirst({
      where: { id: idInt },
      include: { lead: { select: { id: true, filialId: true } } },
    });
    if (!orcamento) throw new AppError('Orçamento não encontrado.', 404);
    assertFilialAccess(orcamento.lead, user);

    const { allowed, reason } = validateTransition(orcamento.status, newStatus);
    if (!allowed) throw new AppError(reason, 400);

    const updated = await tx.orcamento.update({
      where: { id: idInt },
      data: { status: newStatus },
    });

    await addHistoryEvent(
      {
        leadId: orcamento.leadId,
        authorUserId: user.id,
        eventType: LeadEventType.NON_STATUS_CHANGED,
        payload: {
          orcamentoId: orcamento.id,
          numero: orcamento.numero,
          from: orcamento.status,
          to: newStatus,
        },
      },
      tx,
    );

    return updated;
  });
}

/**
 * Cancela um Orçamento (endpoint dedicado /cancel com motivo enum).
 */
export async function cancelOrcamento({ id, motivo, user }) {
  const idInt = assertOrcamentoId(id);
  if (!user?.id) throw new AppError('Usuário autenticado é obrigatório.', 401);
  if (!isValidMotivoCancelamento(motivo)) {
    throw new AppError('motivo inválido — use um dos 5 valores canônicos.', 400);
  }

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM orcamentos WHERE id = ${idInt} FOR UPDATE`;

    const orcamento = await tx.orcamento.findFirst({
      where: { id: idInt },
      include: { lead: { select: { id: true, filialId: true } } },
    });
    if (!orcamento) throw new AppError('Orçamento não encontrado.', 404);
    assertFilialAccess(orcamento.lead, user);

    if (orcamento.status === OrcamentoStatus.CANCELADO) {
      throw new AppError('Orçamento já está cancelado.', 409);
    }

    const updated = await tx.orcamento.update({
      where: { id: idInt },
      data: {
        status: OrcamentoStatus.CANCELADO,
        motivoCancelamento: motivo,
        canceladoEm: new Date(),
      },
    });

    await addHistoryEvent(
      {
        leadId: orcamento.leadId,
        authorUserId: user.id,
        eventType: LeadEventType.NON_CANCELLED,
        payload: {
          orcamentoId: orcamento.id,
          numero: orcamento.numero,
          motivo,
        },
      },
      tx,
    );

    return updated;
  });
}

/**
 * Reativa um Orçamento cancelado — volta pra Nova O.N., limpa motivo.
 */
export async function reactivateOrcamento({ id, user }) {
  const idInt = assertOrcamentoId(id);
  if (!user?.id) throw new AppError('Usuário autenticado é obrigatório.', 401);

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM orcamentos WHERE id = ${idInt} FOR UPDATE`;

    const orcamento = await tx.orcamento.findFirst({
      where: { id: idInt },
      include: { lead: { select: { id: true, filialId: true } } },
    });
    if (!orcamento) throw new AppError('Orçamento não encontrado.', 404);
    assertFilialAccess(orcamento.lead, user);

    if (orcamento.status !== OrcamentoStatus.CANCELADO) {
      throw new AppError('Só Orçamentos cancelados podem ser reativados.', 409);
    }

    const updated = await tx.orcamento.update({
      where: { id: idInt },
      data: {
        status: OrcamentoStatus.NOVA,
        motivoCancelamento: null,
        reativadoEm: new Date(),
      },
    });

    await addHistoryEvent(
      {
        leadId: orcamento.leadId,
        authorUserId: user.id,
        eventType: LeadEventType.NON_REACTIVATED,
        payload: {
          orcamentoId: orcamento.id,
          numero: orcamento.numero,
        },
      },
      tx,
    );

    return updated;
  });
}

// ─── Facade ────────────────────────────────────────────────────────────────

export const orcamentoService = Object.freeze({
  createOrcamento,
  getOrcamentoById,
  getOrcamentoByLeadId,
  listOrcamentos,
  transitionOrcamentoStatus,
  cancelOrcamento,
  reactivateOrcamento,
});
