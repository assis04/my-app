/**
 * leadService — endpoints legados da Fila da Vez.
 *
 * Após Task #21 (plan §2.9):
 *   - Criação de Lead DELEGA para o fluxo canônico leadCrmService.createLead
 *     com assignmentStrategy='queue'/'manual'
 *   - Rotação da fila vive em queueAssignmentService
 *   - Este arquivo guarda só: leitura da fila, toggle de disponibilidade,
 *     histórico de leads da fila, e os wrappers lock-protegidos dos dois
 *     endpoints legados de captação (/lead/quick, /lead/manual)
 */

import prisma from '../config/prisma.js';
import AppError from '../utils/AppError.js';
import { withQueueLock } from '../utils/redisLock.js';
import { createLead } from './leadCrmService.js';

/**
 * Retorna os vendedores da Fila ordenados pela vez.
 * Também faz auto-enrollment de vendedores ativos ainda não enfileirados.
 */
export async function getQueueRanking(branchId) {
  const branchIdNum = parseInt(branchId, 10);
  if (isNaN(branchIdNum)) throw new AppError('ID de filial inválido.', 400);

  // AUTO-ENROLLMENT: insere vendedores ativos da filial que ainda não estão na fila
  await prisma.$queryRaw`
    INSERT INTO branch_sales_queues (branch_id, user_id, is_available, attend_count_30d, position)
    SELECT ${branchIdNum}, u.id, true, 0, (SELECT COALESCE(MAX(position), 0) + 1 FROM branch_sales_queues WHERE branch_id = ${branchIdNum})
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.filial_id = ${branchIdNum}
      AND u.ativo = true
      AND LOWER(r.nome) = 'vendedor'
      AND NOT EXISTS (
        SELECT 1 FROM branch_sales_queues sq
        WHERE sq.branch_id = ${branchIdNum} AND sq.user_id = u.id
      )
  `;

  const queueStatus = await prisma.$queryRaw`
    SELECT
      sq.user_id as "id",
      u.nome,
      sq.is_available as "isAvailable",
      sq.last_assigned_at as "lastAssignedAt",
      sq.attend_count_30d as "attendCount30d",
      sq.position
    FROM branch_sales_queues sq
    JOIN users u ON u.id = sq.user_id
    JOIN roles r ON r.id = u.role_id
    WHERE sq.branch_id = ${branchIdNum}
      AND u.filial_id = ${branchIdNum}
      AND u.ativo = true
      AND LOWER(r.nome) = 'vendedor'
    ORDER BY sq.position ASC;
  `;

  return queueStatus.map((item) => ({
    ...item,
    position: Number(item.position),
    attendCount30d: Number(item.attendCount30d),
  }));
}

// ─── Atribuição (delega ao fluxo canônico) ────────────────────────────────

/**
 * Adapta o body legado da captação (keys em snake_case, `telefone` em vez
 * de `celular`) para o schema canônico que leadCrmService.createLead aceita.
 */
function adaptLegacyLeadBody(leadData, defaultName) {
  return {
    nome: leadData.nome || defaultName,
    sobrenome: leadData.sobrenome,
    celular: leadData.telefone, // validação formal acontece dentro do createLead
    cep: leadData.cep || '',
    email: leadData.email,
    tipoImovel: leadData.tipoImovel,
    statusImovel: leadData.statusImovel,
    plantaPath: leadData.plantaPath,
    pedidosContratos: leadData.pedidosContratos,
    canal: leadData.canal,
    origem: leadData.origem,
    parceria: leadData.parceria,
    gerenteId: leadData.gerenteId,
  };
}

/**
 * Atribuição Rápida: pega o 1º disponível e atribui o lead.
 * Wrapper que delega ao leadCrmService.createLead(assignmentStrategy='queue').
 * Lock distribuído por filial (Task #18) protege contra race condition.
 */
export async function assignLeadQuick(branchId, leadData, user = null) {
  const branchIdNum = parseInt(branchId, 10);
  if (isNaN(branchIdNum)) throw new AppError('ID de filial inválido.', 400);

  // Valida formato do telefone ANTES do lock pra fast-fail
  if (!leadData?.telefone) throw new AppError('O telefone é obrigatório.', 400);
  const digits = String(leadData.telefone).replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 11) {
    throw new AppError('O telefone deve ter entre 10 e 11 dígitos (incluindo DDD).', 400);
  }

  return withQueueLock(branchIdNum, async () => {
    const lead = await createLead(
      adaptLegacyLeadBody(leadData, 'Lead Rápido'),
      user,
      { assignmentStrategy: 'queue', filialId: branchIdNum },
    );
    return {
      leadId: lead.id,
      accountId: lead.contaId,
      assignedUserId: lead.vendedorId,
      vendedorNome: lead.vendedor?.nome,
    };
  });
}

/**
 * Atribuição Manual: atribui a um vendedor específico.
 */
export async function assignLeadManual(branchId, leadData, assignedUserId, user = null) {
  const branchIdNum = parseInt(branchId, 10);
  const userIdNum = parseInt(assignedUserId, 10);
  if (isNaN(branchIdNum) || isNaN(userIdNum)) {
    throw new AppError('IDs de filial ou usuário inválidos.', 400);
  }

  if (!leadData?.telefone) throw new AppError('O telefone é obrigatório.', 400);
  const digits = String(leadData.telefone).replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 11) {
    throw new AppError('O telefone deve ter entre 10 e 11 dígitos (incluindo DDD).', 400);
  }

  return withQueueLock(branchIdNum, async () => {
    const lead = await createLead(
      adaptLegacyLeadBody(leadData, leadData.telefone || 'Lead Manual'),
      user,
      {
        assignmentStrategy: 'manual',
        filialId: branchIdNum,
        assignedUserId: userIdNum,
      },
    );
    return {
      leadId: lead.id,
      accountId: lead.contaId,
      assignedUserId: lead.vendedorId,
      vendedorNome: lead.vendedor?.nome || 'Desconhecido',
    };
  });
}

// ─── Fila: disponibilidade e histórico ────────────────────────────────────

/**
 * Alterna a disponibilidade de um vendedor na Fila.
 */
export async function toggleQueueStatus(branchId, userId, isAvailable) {
  const branchIdNum = parseInt(branchId, 10);
  const userIdNum = parseInt(userId, 10);

  return prisma.salesQueue.upsert({
    where: { filialId_userId: { filialId: branchIdNum, userId: userIdNum } },
    update: { isAvailable },
    create: { filialId: branchIdNum, userId: userIdNum, isAvailable },
  });
}

/**
 * Histórico dos últimos 30 leads distribuídos na filial.
 */
export async function getLeadHistory(branchId) {
  const branchIdNum = parseInt(branchId, 10);
  if (isNaN(branchIdNum)) throw new AppError('ID de filial inválido.', 400);

  const leads = await prisma.lead.findMany({
    where: { filialId: branchIdNum, fonte: 'fila', deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: {
      vendedor: { select: { id: true, nome: true } },
      gerente: { select: { id: true, nome: true } },
    },
  });

  // Backward-compat aliases para o frontend não quebrar
  return leads.map((lead) => ({
    ...lead,
    telefone: lead.celular,
    user: lead.vendedor,
    userId: lead.vendedorId,
  }));
}
