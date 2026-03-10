import prisma from '../config/prisma.js';
import AppError from '../utils/AppError.js';

/**
 * Retorna os vendedores da Fila ordenados pela vez.
 * A QUERY RAW é usada para calcular a posição usando ROW_NUMBER.
 */
export async function getQueueRanking(branchId) {
  const branchIdNum = parseInt(branchId, 10);
  
  if (isNaN(branchIdNum)) {
    throw new AppError('ID de filial inválido.', 400);
  }

  // AUTO-ENROLLMENT: Insere vendedores ativos da filial que ainda não estão na fila
  // Somente usuários com cargo "Vendedor"
  await prisma.$queryRaw`
    INSERT INTO branch_sales_queues (branch_id, user_id, is_available, attend_count_30d)
    SELECT ${branchIdNum}, u.id, true, 0
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

  // Executa o algoritmo SQL fornecido para rankear os vendedores da filial
  // Somente usuários com cargo "Vendedor"
  const queueStatus = await prisma.$queryRaw`
    SELECT 
      sq.user_id as "id",
      u.nome,
      sq.is_available as "isAvailable",
      sq.last_assigned_at as "lastAssignedAt",
      sq.attend_count_30d as "attendCount30d",
      ROW_NUMBER() OVER (
        PARTITION BY sq.branch_id 
        ORDER BY 
          sq.last_assigned_at ASC NULLS FIRST,
          sq.attend_count_30d ASC,
          sq.is_available DESC,
          u.id ASC
      ) as "position"
    FROM branch_sales_queues sq
    JOIN users u ON u.id = sq.user_id
    JOIN roles r ON r.id = u.role_id
    WHERE sq.branch_id = ${branchIdNum} 
      AND u.filial_id = ${branchIdNum} 
      AND u.ativo = true
      AND LOWER(r.nome) = 'vendedor'
    ORDER BY "position" ASC;
  `;

  // Converter BigInt para Number (Problema do Prisma RawQueries + JSON.stringify)
  return queueStatus.map(item => ({
    ...item,
    position: typeof item.position === 'bigint' ? Number(item.position) : item.position,
    attendCount30d: typeof item.attendCount30d === 'bigint' ? Number(item.attendCount30d) : item.attendCount30d
  }));
}

/**
 * Processo Atômico de Atribuição Rápida de Lead.
 * Pega o Vendedor #1 Disponível e o atribui o lead.
 */
export async function assignLeadQuick(branchId, leadData, creatorUserId) {
  const branchIdNum = parseInt(branchId, 10);
  if (isNaN(branchIdNum)) {
    throw new AppError('ID de filial inválido.', 400);
  }

  // Transaction for Atomicity: Prevent Race Conditions when 2 leads arrive exactly at same time
  return await prisma.$transaction(async (tx) => {
    // 1. Obter a fila travada (FOR UPDATE SKIP LOCKED se fosse postgres direto, mas Prisma $queryRaw pode usar)
    // Para simplificar no Prisma, pegamos o top 1 disponivel:
    const topVendedorQuery = await tx.$queryRaw`
      SELECT sq.user_id
      FROM branch_sales_queues sq
      JOIN users u ON u.id = sq.user_id
      WHERE sq.branch_id = ${branchIdNum} 
        AND sq.is_available = true 
        AND u.filial_id = ${branchIdNum}
        AND u.ativo = true
      ORDER BY 
          sq.last_assigned_at ASC NULLS FIRST,
          sq.attend_count_30d ASC,
          u.id ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED;
    `;

    if (!topVendedorQuery || topVendedorQuery.length === 0) {
      throw new AppError('Nenhum vendedor disponível nesta filial no momento.', 400);
    }

    const assignedUserId = topVendedorQuery[0].user_id;

    // 2. Atualizar as estatísticas do vendedor que recebeu o lead
    await tx.$queryRaw`
      UPDATE branch_sales_queues
      SET 
        last_assigned_at = NOW(),
        attend_count_30d = attend_count_30d + 1
      WHERE branch_id = ${branchIdNum} AND user_id = ${assignedUserId}
    `;

    // 3. Criar o Lead (Reutilizando a tabela Client por enquanto, caso o lead vire cleinte, senao precisariamos de nova tabela. 
    // Criaremos apenas usando os dados mínimos)
    // Conforme o escopo, salvamos na tabela Client.
    const novoLead = await tx.client.create({
      data: {
        nome: leadData.nome || 'Lead Rápido',
        telefone: leadData.telefone,
        filialId: branchIdNum,
        userId: assignedUserId, // O vendedor que foi sorteado na fila
      }
    });

    const vendedorData = await tx.user.findUnique({
      where: { id: assignedUserId },
      select: { id: true, nome: true }
    });

    return {
      leadId: novoLead.id,
      assignedUserId,
      vendedorNome: vendedorData.nome
    };
  });
}

/**
 * Processo de Atribuição Manual de Lead para um Vendedor Específico.
 * 
 * REGRA DA FILA:
 * - Se o lead vai para o 1º da fila: atualiza os stats dele normalmente (ele vai pro fim).
 * - Se o lead vai para qualquer outro: o 1º da fila PERDE A VEZ (vai pro fim),
 *   mas o vendedor escolhido NÃO perde posição (não era a vez dele).
 *   O lead é criado e atribuído ao vendedor escolhido sem mexer na posição dele.
 */
export async function assignLeadManual(branchId, leadData, assignedUserId) {
  const branchIdNum = parseInt(branchId, 10);
  const userIdNum = parseInt(assignedUserId, 10);
  
  if (isNaN(branchIdNum) || isNaN(userIdNum)) {
    throw new AppError('IDs de filial ou usuário inválidos.', 400);
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Descobrir quem é o primeiro da fila atualmente
    const firstInQueueQuery = await tx.$queryRaw`
      SELECT sq.user_id
      FROM branch_sales_queues sq
      JOIN users u ON u.id = sq.user_id
      WHERE sq.branch_id = ${branchIdNum} 
        AND sq.is_available = true 
        AND u.filial_id = ${branchIdNum}
        AND u.ativo = true
      ORDER BY 
          sq.last_assigned_at ASC NULLS FIRST,
          sq.attend_count_30d ASC,
          u.id ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED;
    `;

    const firstUserId = firstInQueueQuery.length > 0 ? firstInQueueQuery[0].user_id : null;
    const isFirstInQueue = firstUserId === userIdNum;

    if (isFirstInQueue) {
      // Caso normal: o lead vai para o primeiro da fila.
      // Atualiza os stats dele (vai pro fim da fila).
      await tx.$queryRaw`
        UPDATE branch_sales_queues
        SET 
          last_assigned_at = NOW(),
          attend_count_30d = attend_count_30d + 1
        WHERE branch_id = ${branchIdNum} AND user_id = ${userIdNum}
      `;
    } else {
      // O lead vai para alguém que NÃO é o primeiro.
      // O primeiro da fila PERDE A VEZ (last_assigned_at = NOW, vai pro fim).
      // O vendedor escolhido NÃO tem sua posição alterada.
      if (firstUserId) {
        await tx.$queryRaw`
          UPDATE branch_sales_queues
          SET 
            last_assigned_at = NOW()
          WHERE branch_id = ${branchIdNum} AND user_id = ${firstUserId}
        `;
      }
    }

    // 2. Criar o Lead vinculando ao vendedor específico
    const novoLead = await tx.client.create({
      data: {
        nome: leadData.nome || leadData.telefone || 'Lead Manual',
        telefone: leadData.telefone,
        filialId: branchIdNum,
        userId: userIdNum,
      }
    });

    const vendedorData = await tx.user.findUnique({
      where: { id: userIdNum },
      select: { id: true, nome: true }
    });

    return {
      leadId: novoLead.id,
      assignedUserId: userIdNum,
      vendedorNome: vendedorData?.nome || 'Desconhecido'
    };
  });
}

/**
 * Alterna a disponibilidade de um vendedor na Fila
 */
export async function toggleQueueStatus(branchId, userId, isAvailable) {
  const branchIdNum = parseInt(branchId, 10);
  const userIdNum = parseInt(userId, 10);

  // Upsert the status in the queue
  const updated = await prisma.salesQueue.upsert({
    where: {
      filialId_userId: { filialId: branchIdNum, userId: userIdNum }
    },
    update: {
      isAvailable: isAvailable
    },
    create: {
      filialId: branchIdNum,
      userId: userIdNum,
      isAvailable: isAvailable
    }
  });

  return updated;
}

/**
 * Obtém o histórico dos últimos 30 leads (Neste caso, Clients) distribuídos 
 */
export async function getLeadHistory(branchId) {
  const branchIdNum = parseInt(branchId, 10);
  
  if (isNaN(branchIdNum)) {
    throw new AppError('ID de filial inválido.', 400);
  }

  // Buscamos os ultimos 30 criados
  const historico = await prisma.client.findMany({
    where: { filialId: branchIdNum },
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: {
      user: {
        select: { id: true, nome: true }
      }
    }
  });

  return historico;
}
