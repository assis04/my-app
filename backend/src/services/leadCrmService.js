import prisma from '../config/prisma.js';
import AppError from '../utils/AppError.js';
import { findOrMatchAccount } from './accountService.js';

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
 * Cria um Lead com a regra transacional obrigatória da Conta.
 *
 * Fluxo:
 * 1. Recebe dados do Lead + dados da pessoa (nome, sobrenome, celular, cep).
 * 2. Dentro de $transaction, executa findOrMatchAccount (celular + nome + cep).
 * 3. Se a Conta existir → vincula. Se não → cria Conta + Lead atomicamente.
 *
 * Aceita criação via usuário interno OU via integração externa (webhook).
 */
export async function createLead(data) {
  const { nome, sobrenome, celular, cep } = data;

  if (!nome || !celular || !cep) {
    throw new AppError('Nome, celular e CEP são obrigatórios.', 400);
  }

  return prisma.$transaction(async (tx) => {
    // 1. Resolver Conta — findOrMatchAccount
    const { account } = await findOrMatchAccount(
      { nome, sobrenome: sobrenome || '', celular, cep },
      tx
    );

    // 2. Criar Lead vinculado à Conta
    const lead = await tx.lead.create({
      data: {
        nome: nome.trim(),
        sobrenome: (sobrenome || '').trim() || null,
        celular: celular.replace(/\D/g, ''),
        email: data.email ? data.email.trim().toLowerCase() : null,
        cep: cep.replace(/\D/g, ''),
        idKanban: data.idKanban || null,
        conjugeNome: data.conjugeNome || null,
        conjugeSobrenome: data.conjugeSobrenome || null,
        conjugeCelular: data.conjugeCelular || null,
        conjugeEmail: data.conjugeEmail || null,
        status: data.status || 'Prospecção',
        etapa: data.etapa || data.etapaJornada || null,
        origemCanal: data.origemCanal || null,
        origemExterna: data.origemExterna === true || data.origemExterna === 'true',
        fonte: 'crm',
        preVendedorId: data.preVendedorId ? parseInt(data.preVendedorId, 10) : null,
        contaId: account.id,
      },
      include: {
        conta: true,
        preVendedor: { select: { id: true, nome: true } },
      },
    });

    // Backward-compat aliases
    lead.etapaJornada = lead.etapa;
    lead.dataCadastro = lead.createdAt;

    return lead;
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
 */
export async function getLeadById(id, user) {
  const where = { id: parseInt(id, 10), deletedAt: null };
  enforceFilialScope(where, user);

  const lead = await prisma.lead.findFirst({
    where,
    include: {
      preVendedor: { select: { id: true, nome: true, email: true } },
      conta: true,
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
 * Não permite alterar contaId (o vínculo com Conta é imutável após criação).
 */
export async function updateLead(id, data, user) {
  const idNum = parseInt(id, 10);
  await assertLeadAccess(idNum, user);

  const existing = await prisma.lead.findFirst({ where: { id: idNum, deletedAt: null } });
  if (!existing) throw new AppError('Lead não encontrado.', 404);

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
      status: data.status,
      etapa: data.etapa ?? data.etapaJornada,
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
