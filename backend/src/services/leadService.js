import prisma from '../config/prisma.js';
import AppError from '../utils/AppError.js';
import { findOrMatchAccount } from './accountService.js';
import { withQueueLock } from '../utils/redisLock.js';

/**
 * Retorna os vendedores da Fila ordenados pela vez.
 */
export async function getQueueRanking(branchId) {
  const branchIdNum = parseInt(branchId, 10);
  if (isNaN(branchIdNum)) throw new AppError('ID de filial inválido.', 400);

  // AUTO-ENROLLMENT: Insere vendedores ativos da filial que ainda não estão na fila
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

  return queueStatus.map(item => ({
    ...item,
    position: Number(item.position),
    attendCount30d: Number(item.attendCount30d)
  }));
}

// ─── Funções auxiliares internas ──────────────────────────────────────────

/**
 * Normaliza as posições da fila usando SQL batch (evita N+1).
 */
async function recalculatePositions(branchIdNum, tx) {
  await tx.$executeRaw`
    UPDATE branch_sales_queues AS bsq
    SET position = sub.rn
    FROM (
      SELECT user_id, branch_id,
             ROW_NUMBER() OVER (ORDER BY position ASC) AS rn
      FROM branch_sales_queues
      WHERE branch_id = ${branchIdNum}
    ) AS sub
    WHERE bsq.user_id = sub.user_id
      AND bsq.branch_id = sub.branch_id
      AND bsq.branch_id = ${branchIdNum}
  `;
}

/**
 * Valida formato e normaliza o telefone do lead.
 *
 * NÃO checa duplicidade: spec §4.2 permite N Leads por mesmo celular
 * (uma pessoa pode ter várias oportunidades abertas ao longo do tempo).
 * A identificação cruzada é via Account (celular + nome + cep) e o
 * findOrMatchAccount cuida de reusar a Conta existente.
 */
function validateAndNormalizePhone(telefone) {
  if (!telefone) throw new AppError('O telefone é obrigatório.', 400);

  const digits = telefone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 11) {
    throw new AppError('O telefone deve ter entre 10 e 11 dígitos (incluindo DDD).', 400);
  }

  return digits;
}

/**
 * Aplica a rotação da fila: move o atendente pro fim e, se não era o primeiro,
 * o primeiro lugar perde a vez também.
 */
async function rotateQueue(branchIdNum, assignedUserId, tx) {
  const fullQueue = await tx.salesQueue.findMany({
    where: { filialId: branchIdNum },
    orderBy: { position: 'asc' }
  });

  const firstInQueue = fullQueue[0];
  const maxPos = fullQueue.length > 0 ? Math.max(...fullQueue.map(q => q.position)) : 0;

  if (firstInQueue && assignedUserId !== firstInQueue.userId) {
    // Primeiro lugar perde a vez (vai pro fim)
    await tx.salesQueue.update({
      where: { filialId_userId: { filialId: branchIdNum, userId: firstInQueue.userId } },
      data: { position: maxPos + 1 }
    });
    // Atendente vai para o fim absoluto
    await tx.salesQueue.update({
      where: { filialId_userId: { filialId: branchIdNum, userId: assignedUserId } },
      data: { position: maxPos + 2, lastAssignedAt: new Date(), attendCount30d: { increment: 1 } }
    });
  } else {
    // Atendente já era o primeiro, apenas move para o fim
    await tx.salesQueue.update({
      where: { filialId_userId: { filialId: branchIdNum, userId: assignedUserId } },
      data: { position: maxPos + 1, lastAssignedAt: new Date(), attendCount30d: { increment: 1 } }
    });
  }

  await recalculatePositions(branchIdNum, tx);
}

/**
 * Valida telefone, resolve Conta e cria o Lead da fila.
 * Retorna { novoLead, accountId }.
 */
async function createQueueLead(branchIdNum, assignedUserId, leadData, defaultName, tx) {
  const validPhone = validateAndNormalizePhone(leadData.telefone);

  let accountId = null;
  if (leadData.nome && leadData.telefone && leadData.cep) {
    const { account } = await findOrMatchAccount({
      nome: leadData.nome,
      sobrenome: leadData.sobrenome || '',
      celular: leadData.telefone,
      cep: leadData.cep,
    }, tx);
    accountId = account.id;
  }

  const novoLead = await tx.lead.create({
    data: {
      nome: leadData.nome || defaultName,
      celular: validPhone,
      filialId: branchIdNum,
      vendedorId: assignedUserId,
      contaId: accountId,
      fonte: 'fila',
      etapa: leadData.etapa || 'Novo',
      status: leadData.status || 'Ativo',
      tipoImovel: leadData.tipoImovel,
      statusImovel: leadData.statusImovel,
      plantaPath: leadData.plantaPath,
      gerenteId: leadData.gerenteId ? parseInt(leadData.gerenteId, 10) : null,
      pedidosContratos: leadData.pedidosContratos,
      canal: leadData.canal,
      origem: leadData.origem,
      parceria: leadData.parceria,
    }
  });

  return { novoLead, accountId };
}

// ─── Funções públicas ────────────────────────────────────────────────────

/**
 * Atribuição Rápida: pega o 1º disponível e atribui o lead.
 *
 * Lock distribuído por filial (plan §2.5 / Task #18): duas capturas
 * simultâneas na mesma filial NUNCA atribuem o mesmo vendedor. O lock
 * envolve a transação inteira — se a segunda chegar durante a primeira,
 * recebe 409 e o frontend retenta.
 */
export async function assignLeadQuick(branchId, leadData) {
  const branchIdNum = parseInt(branchId, 10);
  if (isNaN(branchIdNum)) throw new AppError('ID de filial inválido.', 400);

  return withQueueLock(branchIdNum, () =>
    prisma.$transaction(async (tx) => {
      const availableSellers = await tx.salesQueue.findMany({
        where: { filialId: branchIdNum, isAvailable: true },
        orderBy: { position: 'asc' },
        take: 1
      });

      if (availableSellers.length === 0) {
        throw new AppError('Nenhum vendedor disponível nesta filial no momento.', 400);
      }

      const assignedUserId = availableSellers[0].userId;

      await rotateQueue(branchIdNum, assignedUserId, tx);
      const { novoLead, accountId } = await createQueueLead(branchIdNum, assignedUserId, leadData, 'Lead Rápido', tx);

      const vendedor = await tx.user.findUnique({
        where: { id: assignedUserId },
        select: { id: true, nome: true }
      });

      return {
        leadId: novoLead.id,
        accountId,
        assignedUserId,
        vendedorNome: vendedor?.nome
      };
    })
  );
}

/**
 * Atribuição Manual: atribui a um vendedor específico.
 *
 * Mesmo lock distribuído por filial do assignLeadQuick — necessário
 * porque rotateQueue reescreve as posições da filial inteira, e duas
 * escritas concorrentes podem embaralhar a ordenação.
 */
export async function assignLeadManual(branchId, leadData, assignedUserId) {
  const branchIdNum = parseInt(branchId, 10);
  const userIdNum = parseInt(assignedUserId, 10);
  if (isNaN(branchIdNum) || isNaN(userIdNum)) {
    throw new AppError('IDs de filial ou usuário inválidos.', 400);
  }

  return withQueueLock(branchIdNum, () =>
    prisma.$transaction(async (tx) => {
      const actor = await tx.salesQueue.findUnique({
        where: { filialId_userId: { filialId: branchIdNum, userId: userIdNum } }
      });
      if (!actor) throw new AppError('Vendedor não encontrado na fila.', 404);

      await rotateQueue(branchIdNum, userIdNum, tx);
      const { novoLead, accountId } = await createQueueLead(branchIdNum, userIdNum, leadData, leadData.telefone || 'Lead Manual', tx);

      const vendedor = await tx.user.findUnique({
        where: { id: userIdNum },
        select: { id: true, nome: true }
      });

      return {
        leadId: novoLead.id,
        accountId,
        assignedUserId: userIdNum,
        vendedorNome: vendedor?.nome || 'Desconhecido'
      };
    })
  );
}

/**
 * Alterna a disponibilidade de um vendedor na Fila.
 */
export async function toggleQueueStatus(branchId, userId, isAvailable) {
  const branchIdNum = parseInt(branchId, 10);
  const userIdNum = parseInt(userId, 10);

  return prisma.salesQueue.upsert({
    where: { filialId_userId: { filialId: branchIdNum, userId: userIdNum } },
    update: { isAvailable },
    create: { filialId: branchIdNum, userId: userIdNum, isAvailable }
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
      gerente: { select: { id: true, nome: true } }
    }
  });

  // Backward-compat aliases para o frontend não quebrar
  return leads.map(lead => ({
    ...lead,
    telefone: lead.celular,
    user: lead.vendedor,
    userId: lead.vendedorId,
  }));
}
