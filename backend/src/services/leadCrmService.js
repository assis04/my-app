import prisma from '../config/prisma.js';
import AppError from '../utils/AppError.js';
import { findOrMatchAccount } from './accountService.js';
import {
  LeadStatus,
  LeadEtapa,
  requiresAdminToEdit,
} from '../domain/leadStatus.js';
import { LeadEventType } from '../domain/leadEvents.js';
import { add as addHistoryEvent } from './leadHistoryService.js';
import {
  pickNextAvailableSeller,
  assertSellerOnQueue,
  rotateQueueAfterAssignment,
} from './queueAssignmentService.js';

function isAdm(user) {
  return user?.role === 'ADM' || user?.permissions?.includes('*');
}

function enforceFilialScope(where, user) {
  if (!isAdm(user) && user?.filialId) {
    where.filialId = user.filialId;
  }
  return where;
}

async function assertLeadAccess(leadId, user) {
  const lead = await prisma.lead.findFirst({
    where: { id: parseInt(leadId, 10), deletedAt: null },
  });
  if (!lead) throw new AppError('Lead não encontrado.', 404);
  if (!isAdm(user) && user?.filialId && lead.filialId !== user.filialId) {
    throw new AppError('Acesso negado: lead de outra filial.', 403);
  }
  return lead;
}

/**
 * Cria um Lead — FLUXO CANÔNICO ÚNICO (Task #21, plan §2.9).
 *
 * Responsável por:
 *   1. Resolver Account via findOrMatchAccount (quando cep presente)
 *   2. Atribuir responsável conforme `opts.assignmentStrategy`:
 *      - 'crm'      → usa preVendedorId de `data` (flow /leads); sem fila
 *      - 'queue'    → pega próximo vendedor disponível; rotaciona fila
 *      - 'manual'   → usa `opts.assignedUserId`; valida que está na fila; rotaciona
 *      - 'external' → webhook; sem atribuição automática (responsável "Não Definido")
 *   3. Criar o Lead com defaults CANÔNICOS (status="Em prospecção", etapa="Prospecção")
 *   4. Criar KanbanCard 1:1 transacionalmente (spec §4.6 / plan §2.3)
 *   5. Registrar evento de criação no LeadHistory
 *
 * NOTA: o lock distribuído (withQueueLock) é responsabilidade do caller
 * para as strategies 'queue' e 'manual' — ver leadService.assignLead*.
 *
 * @param {object} data - payload do Lead (nome, celular, cep, ... e campos opcionais)
 * @param {object|null} [user] - usuário autenticado que disparou a ação
 * @param {object} [opts]
 * @param {'crm'|'queue'|'manual'|'external'} [opts.assignmentStrategy='crm']
 * @param {number} [opts.filialId] - obrigatório para 'queue' e 'manual'
 * @param {number} [opts.assignedUserId] - obrigatório para 'manual'
 * @returns {Promise<object>} Lead criado (inclui kanbanCard, conta, relações de atribuição)
 */
export async function createLead(data, user = null, opts = {}) {
  const {
    assignmentStrategy = 'crm',
    filialId: optsFilialId,
    assignedUserId: optsAssignedUserId,
  } = opts;

  const { nome, sobrenome, celular, cep } = data;

  if (!nome || !celular) {
    throw new AppError('Nome e celular são obrigatórios.', 400);
  }

  // filial vem ou de opts (flows fila) ou de data (flow CRM direto)
  const filialId = optsFilialId ?? (data.filialId ? parseInt(data.filialId, 10) : null);

  if (assignmentStrategy === 'queue' && !filialId) {
    throw new AppError('filialId é obrigatório para estratégia "queue".', 400);
  }
  if (assignmentStrategy === 'manual' && (!filialId || !optsAssignedUserId)) {
    throw new AppError('filialId e assignedUserId são obrigatórios para estratégia "manual".', 400);
  }

  return prisma.$transaction(async (tx) => {
    // 1. Resolver Conta quando há identidade completa
    let contaId = null;
    if (cep) {
      const { account } = await findOrMatchAccount(
        { nome, sobrenome: sobrenome || '', celular, cep },
        tx,
      );
      contaId = account.id;
    }

    // 2. Atribuir responsável
    let vendedorId = null;
    let preVendedorId = data.preVendedorId != null && data.preVendedorId !== ''
      ? parseInt(data.preVendedorId, 10)
      : null;

    if (assignmentStrategy === 'queue') {
      vendedorId = await pickNextAvailableSeller(filialId, tx);
      await rotateQueueAfterAssignment(filialId, vendedorId, tx);
    } else if (assignmentStrategy === 'manual') {
      await assertSellerOnQueue(filialId, optsAssignedUserId, tx);
      vendedorId = optsAssignedUserId;
      await rotateQueueAfterAssignment(filialId, vendedorId, tx);
    }
    // 'crm' e 'external' não mexem na fila — preVendedorId vem de data (ou null)

    // 3. Criar o Lead com defaults canônicos
    const origemExterna = data.origemExterna === true || data.origemExterna === 'true';
    const lead = await tx.lead.create({
      data: {
        // Identidade
        nome: nome.trim(),
        sobrenome: (sobrenome || '').trim() || null,
        celular: celular.replace(/\D/g, ''),
        email: data.email ? data.email.trim().toLowerCase() : null,
        cpfCnpj: data.cpfCnpj ?? null,
        cep: cep ? cep.replace(/\D/g, '') : null,
        endereco: data.endereco ?? null,
        // Pipeline canônico — NUNCA lê de data
        status: LeadStatus.EM_PROSPECCAO,
        etapa: LeadEtapa.PROSPECCAO,
        // Imóvel
        tipoImovel: data.tipoImovel ?? null,
        statusImovel: data.statusImovel ?? null,
        plantaPath: data.plantaPath ?? null,
        pedidosContratos: data.pedidosContratos ?? null,
        // Marketing
        canal: data.canal ?? null,
        origem: data.origem ?? null,
        parceria: data.parceria ?? null,
        origemCanal: data.origemCanal ?? null,
        origemExterna,
        // Cônjuge
        conjugeNome: data.conjugeNome ?? null,
        conjugeSobrenome: data.conjugeSobrenome ?? null,
        conjugeCelular: data.conjugeCelular ?? null,
        conjugeEmail: data.conjugeEmail ?? null,
        // Atribuições
        vendedorId,
        preVendedorId,
        gerenteId: data.gerenteId ? parseInt(data.gerenteId, 10) : null,
        filialId,
        contaId,
        // Origem
        fonte: data.fonte || (assignmentStrategy === 'queue' || assignmentStrategy === 'manual' ? 'fila' : 'crm'),
      },
      include: {
        conta: true,
        vendedor: { select: { id: true, nome: true } },
        preVendedor: { select: { id: true, nome: true } },
      },
    });

    // 4. KanbanCard 1:1 (transacional com o Lead)
    const maxPosResult = await tx.kanbanCard.aggregate({
      where: { coluna: LeadEtapa.PROSPECCAO },
      _max: { posicao: true },
    });
    const nextPos = (maxPosResult._max.posicao ?? 0) + 1;
    const kanbanCard = await tx.kanbanCard.create({
      data: {
        leadId: lead.id,
        coluna: LeadEtapa.PROSPECCAO,
        posicao: nextPos,
      },
    });

    // 5. Histórico de criação
    await addHistoryEvent(
      {
        leadId: lead.id,
        authorUserId: user?.id ?? null,
        eventType: origemExterna ? LeadEventType.EXTERNAL_CREATED : LeadEventType.NOTE_ADDED,
        payload: origemExterna
          ? { source: data.fonte || 'external' }
          : { text: `Lead criado via ${assignmentStrategy}` },
      },
      tx,
    );

    // Backward-compat aliases
    lead.etapaJornada = lead.etapa;
    lead.dataCadastro = lead.createdAt;

    return { ...lead, kanbanCard };
  });
}

/**
 * Lista todos os Leads com filtros opcionais.
 * Ordenação padrão: dataCadastro DESC (mais recente primeiro).
 */
export async function listLeads({ search, status, preVendedorId, page = 1, limit = 50 }, user) {
  const where = { deletedAt: null };
  enforceFilialScope(where, user);

  if (status) where.status = status;
  if (preVendedorId) where.preVendedorId = parseInt(preVendedorId, 10);

  if (search) {
    where.OR = [
      { nome: { contains: search, mode: 'insensitive' } },
      { sobrenome: { contains: search, mode: 'insensitive' } },
      { celular: { contains: search } },
      { cep: { contains: search } },
      { conta: { nome: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const take = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (pageNum - 1) * take;

  const [data, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        preVendedor: { select: { id: true, nome: true } },
        conta: { select: { id: true, nome: true, sobrenome: true, celular: true, cep: true } },
      },
      skip,
      take,
    }),
    prisma.lead.count({ where }),
  ]);

  // Backward-compat aliases
  const aliasedData = data.map((lead) => ({
    ...lead,
    etapaJornada: lead.etapa,
    dataCadastro: lead.createdAt,
  }));

  return { data: aliasedData, total, page: pageNum, limit: take, totalPages: Math.ceil(total / take) };
}

/**
 * Busca um Lead por ID com todas as relações.
 * Inclui kanbanCard (1:1) e os últimos 20 eventos do histórico — plan §4.6.
 * Para paginação completa do histórico, use GET /leads/:id/history.
 */
export async function getLeadById(id, user) {
  const where = { id: parseInt(id, 10), deletedAt: null };
  enforceFilialScope(where, user);

  const lead = await prisma.lead.findFirst({
    where,
    include: {
      preVendedor: { select: { id: true, nome: true, email: true } },
      conta: true,
      kanbanCard: true,
      history: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          authorUser: { select: { id: true, nome: true } },
        },
      },
    },
  });

  if (!lead) throw new AppError('Lead não encontrado.', 404);

  // Backward-compat aliases
  lead.etapaJornada = lead.etapa;
  lead.dataCadastro = lead.createdAt;

  return lead;
}

/**
 * Atualiza um Lead existente.
 *
 * Guards (plan §2.8 e §9.3):
 *   - Rejeita tentativa de mutar `status`/`etapa` via esse endpoint — força
 *     uso do PUT /leads/:id/status (que passa pela statusMachine, registra
 *     história e move KanbanCard consistentemente).
 *   - Bloqueia edição de Lead em Venda/Pós-venda exceto para usuários com
 *     permissão explícita `crm:leads:edit-after-sale` (spec §9.14).
 *
 * Não permite alterar contaId (o vínculo com Conta é imutável após criação).
 */
export async function updateLead(id, data, user) {
  const idNum = parseInt(id, 10);

  // Guard 1: mutação de status/etapa redireciona para o endpoint dedicado
  if (data?.status !== undefined || data?.etapa !== undefined || data?.etapaJornada !== undefined) {
    throw new AppError(
      'Mudança de status/etapa não é permitida via PUT /leads/:id. Use PUT /leads/:id/status.',
      400,
    );
  }

  // Guard 2: campos gerenciados pelo orquestrador são read-only aqui
  const MANAGED_FIELDS = ['temperatura', 'statusAntesCancelamento', 'canceladoEm', 'reativadoEm', 'kanbanCard'];
  for (const field of MANAGED_FIELDS) {
    if (data?.[field] !== undefined) {
      throw new AppError(
        `Campo "${field}" não é editável via PUT /leads/:id. Use o endpoint dedicado.`,
        400,
      );
    }
  }

  await assertLeadAccess(idNum, user);

  const existing = await prisma.lead.findFirst({ where: { id: idNum, deletedAt: null } });
  if (!existing) throw new AppError('Lead não encontrado.', 404);

  // Guard 3: edição pós-venda exige permissão explícita
  if (requiresAdminToEdit(existing.status)) {
    const userPerms = Array.isArray(user?.permissions) ? user.permissions : [];
    if (!userPerms.includes('crm:leads:edit-after-sale')) {
      throw new AppError(
        'Lead com venda concluída só pode ser editado por ADM com permissão crm:leads:edit-after-sale.',
        403,
      );
    }
  }

  const updated = await prisma.lead.update({
    where: { id: idNum },
    data: {
      nome: data.nome,
      sobrenome: data.sobrenome,
      celular: data.celular ? data.celular.replace(/\D/g, '') : undefined,
      email: data.email !== undefined ? (data.email ? data.email.trim().toLowerCase() : null) : undefined,
      cep: data.cep ? data.cep.replace(/\D/g, '') : undefined,
      idKanban: data.idKanban,
      conjugeNome: data.conjugeNome,
      conjugeSobrenome: data.conjugeSobrenome,
      conjugeCelular: data.conjugeCelular,
      conjugeEmail: data.conjugeEmail,
      origemCanal: data.origemCanal,
      preVendedorId: data.preVendedorId !== undefined
        ? (data.preVendedorId ? parseInt(data.preVendedorId, 10) : null)
        : undefined,
    },
    include: {
      preVendedor: { select: { id: true, nome: true } },
      conta: { select: { id: true, nome: true, sobrenome: true } },
    },
  });

  // Backward-compat aliases
  updated.etapaJornada = updated.etapa;
  updated.dataCadastro = updated.createdAt;

  return updated;
}

/**
 * Remove um Lead.
 */
export async function deleteLead(id, user) {
  const idNum = parseInt(id, 10);
  await assertLeadAccess(idNum, user);

  const existing = await prisma.lead.findFirst({ where: { id: idNum, deletedAt: null } });
  if (!existing) throw new AppError('Lead não encontrado.', 404);

  return prisma.lead.update({
    where: { id: idNum },
    data: { deletedAt: new Date() },
  });
}

/**
 * Transferência de responsável (individual ou em lote).
 */
export async function transferLeads(leadIds, newPreVendedorId, caller) {
  const preVendedorId = parseInt(newPreVendedorId, 10);

  const targetUser = await prisma.user.findUnique({ where: { id: preVendedorId } });
  if (!targetUser) throw new AppError('Pré-vendedor de destino não encontrado.', 404);

  const where = { id: { in: leadIds.map(id => parseInt(id, 10)) }, deletedAt: null };
  enforceFilialScope(where, caller);

  return prisma.lead.updateMany({
    where,
    data: { preVendedorId },
  });
}

/**
 * Atualiza a etapa em lote.
 */
export async function updateEtapaLote(leadIds, etapa, caller) {
  const where = { id: { in: leadIds.map(id => parseInt(id, 10)) }, deletedAt: null };
  enforceFilialScope(where, caller);

  return prisma.lead.updateMany({
    where,
    data: { etapa },
  });
}
