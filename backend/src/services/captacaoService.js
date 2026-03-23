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

/**
 * Normaliza as posições da fila para evitar buracos (1, 2, 3...).
 */
async function recalculatePositions(branchIdNum, tx = prisma) {
  const queue = await tx.salesQueue.findMany({
    where: { filialId: branchIdNum },
    orderBy: { position: 'asc' }
  });

  for (let i = 0; i < queue.length; i++) {
    await tx.salesQueue.update({
      where: { filialId_userId: { filialId: branchIdNum, userId: queue[i].userId } },
      data: { position: i + 1 }
    });
  }
}

/**
 * Valida o formato e a unicidade do telefone do lead.
 */
async function validateLeadPhone(telefone, tx = prisma) {
  if (!telefone) {
    throw new AppError('O telefone é obrigatório.', 400);
  }

  // Remove caracteres não numéricos para validação
  const digits = telefone.replace(/\D/g, '');
  
  if (digits.length < 10 || digits.length > 11) {
    throw new AppError('O telefone deve ter entre 10 e 11 dígitos (incluindo DDD).', 400);
  }

  // Verifica se já existe um cliente/lead com este telefone
  const existingClient = await tx.client.findFirst({
    where: { telefone: digits }
  });

  if (existingClient) {
    throw new AppError(`O telefone ${telefone} já está cadastrado no sistema para o lead/cliente "${existingClient.nome}".`, 400);
  }

  return digits;
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

  return await prisma.$transaction(async (tx) => {
    // 1. Pega o primeiro disponível por posição
    const availableSellers = await tx.salesQueue.findMany({
      where: { filialId: branchIdNum, isAvailable: true },
      orderBy: { position: 'asc' },
      take: 1
    });

    if (availableSellers.length === 0) {
      throw new AppError('Nenhum vendedor disponível nesta filial no momento.', 400);
    }

    const assignedUserId = availableSellers[0].userId;

    // 2. Busca a fila completa para identificar quem é o atual primeiro lugar
    const fullQueue = await tx.salesQueue.findMany({
      where: { filialId: branchIdNum },
      orderBy: { position: 'asc' }
    });

    const firstInQueue = fullQueue[0];
    const maxPos = fullQueue.length > 0 ? Math.max(...fullQueue.map(q => q.position)) : 0;

    // 3. Aplica a rotação:
    // Se o atendente NÃO for o primeiro, o primeiro perde a vez e vai pro fim.
    // O atendente sempre vai para o fim absoluto.
    if (firstInQueue && assignedUserId !== firstInQueue.userId) {
      // Primeiro lugar perde a vez
      await tx.salesQueue.update({
        where: { filialId_userId: { filialId: branchIdNum, userId: firstInQueue.userId } },
        data: { position: maxPos + 1 }
      });
      // Atendente vai para o fim absoluto
      await tx.salesQueue.update({
        where: { filialId_userId: { filialId: branchIdNum, userId: assignedUserId } },
        data: { 
          position: maxPos + 2,
          lastAssignedAt: new Date(),
          attendCount30d: { increment: 1 }
        }
      });
    } else {
      // Atendente já era o primeiro, apenas move para o fim
      await tx.salesQueue.update({
        where: { filialId_userId: { filialId: branchIdNum, userId: assignedUserId } },
        data: { 
          position: maxPos + 1,
          lastAssignedAt: new Date(),
          attendCount30d: { increment: 1 }
        }
      });
    }

    // 4. Normaliza as posições
    await recalculatePositions(branchIdNum, tx);

    // 5. Validar telefone e criar lead
    const validPhone = await validateLeadPhone(leadData.telefone, tx);
    const novoLead = await tx.client.create({
      data: {
        nome: leadData.nome || 'Lead Rápido',
        telefone: validPhone,
        filialId: branchIdNum,
        userId: assignedUserId,
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

    const vendedorData = await tx.user.findUnique({
      where: { id: assignedUserId },
      select: { id: true, nome: true }
    });

    return {
      leadId: novoLead.id,
      assignedUserId,
      vendedorNome: vendedorData?.nome
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
    // 1. Pega os dados do vendedor e do atual primeiro da fila
    const actor = await tx.salesQueue.findUnique({
      where: { filialId_userId: { filialId: branchIdNum, userId: userIdNum } }
    });

    if (!actor) {
      throw new AppError('Vendedor não encontrado na fila.', 404);
    }

    const actorPosition = actor.position;

    // 2. Busca a fila completa para identificar o atual primeiro lugar
    const fullQueue = await tx.salesQueue.findMany({
      where: { filialId: branchIdNum },
      orderBy: { position: 'asc' }
    });

    const firstInQueue = fullQueue[0];
    const maxPos = fullQueue.length > 0 ? Math.max(...fullQueue.map(q => q.position)) : 0;

    // 3. Aplica a rotação baseada na ação (furo de fila na vida real)
    if (firstInQueue && userIdNum !== firstInQueue.userId) {
      // O primeiro lugar perde a vez (vai pro fim)
      await tx.salesQueue.update({
        where: { filialId_userId: { filialId: branchIdNum, userId: firstInQueue.userId } },
        data: { position: maxPos + 1 }
      });
      // O atendente vai para o fim absoluto
      await tx.salesQueue.update({
        where: { filialId_userId: { filialId: branchIdNum, userId: userIdNum } },
        data: { 
          position: maxPos + 2,
          lastAssignedAt: new Date(),
          attendCount30d: { increment: 1 }
        }
      });
    } else {
      // Atendente era o primeiro, apenas move pro fim
      await tx.salesQueue.update({
        where: { filialId_userId: { filialId: branchIdNum, userId: userIdNum } },
        data: { 
          position: maxPos + 1,
          lastAssignedAt: new Date(),
          attendCount30d: { increment: 1 }
        }
      });
    }

    // 4. Normaliza as posições
    await recalculatePositions(branchIdNum, tx);

    // 5. Validar telefone e criar Lead
    const validPhone = await validateLeadPhone(leadData.telefone, tx);
    const novoLead = await tx.client.create({
      data: {
        nome: leadData.nome || leadData.telefone || 'Lead Manual',
        telefone: validPhone,
        filialId: branchIdNum,
        userId: userIdNum,
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
      },
      gerente: {
        select: { id: true, nome: true }
      }
    }
  });

  return historico;
}
