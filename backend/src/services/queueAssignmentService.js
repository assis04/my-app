/**
 * queueAssignmentService — regras da Fila da Vez extraídas do leadService.
 *
 * Fonte de verdade: specs/crm-plan.md §2.9 / Task #21
 *
 * Todas as funções operam DENTRO de uma transação Prisma — recebem `tx`
 * como parâmetro. Não abrem transação própria; o orquestrador (createLead
 * em leadCrmService) é responsável por isolar atomicidade.
 *
 * Também: o lock distribuído (withQueueLock) é responsabilidade do caller
 * antes de entrar na transação. Aqui assumimos que o lock já foi adquirido.
 */

import AppError from '../utils/AppError.js';

/**
 * Seleciona o próximo vendedor disponível da filial via ordenação por
 * position ASC. Lança 400 quando nenhum vendedor está disponível.
 */
export async function pickNextAvailableSeller(filialId, tx) {
  const available = await tx.salesQueue.findMany({
    where: { filialId, isAvailable: true },
    orderBy: { position: 'asc' },
    take: 1,
  });
  if (available.length === 0) {
    throw new AppError('Nenhum vendedor disponível nesta filial no momento.', 400);
  }
  return available[0].userId;
}

/**
 * Confirma que um vendedor específico está na fila da filial.
 * Usado pela atribuição manual (usuário escolheu o vendedor destino).
 */
export async function assertSellerOnQueue(filialId, userId, tx) {
  const entry = await tx.salesQueue.findUnique({
    where: { filialId_userId: { filialId, userId } },
  });
  if (!entry) throw new AppError('Vendedor não encontrado na fila.', 404);
  return entry;
}

/**
 * Rotação FIFO após atribuição:
 *   - Se o atendente não era o primeiro da fila, o primeiro "perde a vez"
 *     (vai pro fim) + o atendente vai pro fim absoluto.
 *   - Se o atendente era o primeiro, apenas ele vai pro fim.
 *
 * Em seguida, normaliza as positions da filial via UPDATE com ROW_NUMBER()
 * para manter a sequência contígua (1, 2, 3, ...).
 */
export async function rotateQueueAfterAssignment(filialId, assignedUserId, tx) {
  const fullQueue = await tx.salesQueue.findMany({
    where: { filialId },
    orderBy: { position: 'asc' },
  });

  const firstInQueue = fullQueue[0];
  const maxPos = fullQueue.length > 0 ? Math.max(...fullQueue.map((q) => q.position)) : 0;

  if (firstInQueue && assignedUserId !== firstInQueue.userId) {
    // Primeiro lugar perde a vez (vai pro fim)
    await tx.salesQueue.update({
      where: { filialId_userId: { filialId, userId: firstInQueue.userId } },
      data: { position: maxPos + 1 },
    });
    // Atendente vai pro fim absoluto
    await tx.salesQueue.update({
      where: { filialId_userId: { filialId, userId: assignedUserId } },
      data: {
        position: maxPos + 2,
        lastAssignedAt: new Date(),
        attendCount30d: { increment: 1 },
      },
    });
  } else {
    // Atendente era o primeiro → apenas move pro fim
    await tx.salesQueue.update({
      where: { filialId_userId: { filialId, userId: assignedUserId } },
      data: {
        position: maxPos + 1,
        lastAssignedAt: new Date(),
        attendCount30d: { increment: 1 },
      },
    });
  }

  // Normaliza positions (1..N contíguo)
  await tx.$executeRaw`
    UPDATE branch_sales_queues AS bsq
    SET position = sub.rn
    FROM (
      SELECT user_id, branch_id,
             ROW_NUMBER() OVER (ORDER BY position ASC) AS rn
      FROM branch_sales_queues
      WHERE branch_id = ${filialId}
    ) AS sub
    WHERE bsq.user_id = sub.user_id
      AND bsq.branch_id = sub.branch_id
      AND bsq.branch_id = ${filialId}
  `;
}

export const queueAssignmentService = Object.freeze({
  pickNextAvailableSeller,
  assertSellerOnQueue,
  rotateQueueAfterAssignment,
});
