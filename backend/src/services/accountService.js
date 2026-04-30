import prisma from '../config/prisma.js';
import AppError from '../utils/AppError.js';

/**
 * findOrMatchAccount — Regra de Identificação Cruzada.
 *
 * Busca uma conta que tenha EXATAMENTE a mesma combinação: celular + nome + cep.
 *   - Se encontrar → retorna a conta existente.
 *   - Se não encontrar → cria uma nova conta na mesma transação.
 *
 * IMPORTANTE: Essa função recebe uma transação Prisma (tx) como parâmetro
 * para garantir atomicidade junto com a criação do Lead.
 * Ela NUNCA deve ser chamada isoladamente para criar contas avulsas.
 */
export async function findOrMatchAccount({ nome, sobrenome, celular, cep }, tx) {
  const client = tx || prisma;

  const celularDigits = celular.replace(/\D/g, '');

  if (!nome || !celularDigits || !cep) {
    throw new AppError('Nome, celular e CEP são obrigatórios para identificação da conta.', 400);
  }

  const existing = await client.account.findUnique({
    where: {
      account_identity: {
        celular: celularDigits,
        nome: nome.trim(),
        cep: cep.replace(/\D/g, ''),
      },
    },
  });

  if (existing) {
    return { account: existing, isNew: false };
  }

  const newAccount = await client.account.create({
    data: {
      nome: nome.trim(),
      sobrenome: (sobrenome || '').trim(),
      celular: celularDigits,
      cep: cep.replace(/\D/g, ''),
    },
  });

  return { account: newAccount, isNew: true };
}

function isAdm(user) {
  return user?.role === 'ADM' || user?.permissions?.includes('*');
}

/**
 * Listagem de contas com filtros — somente leitura.
 *
 * Filtros aceitos (todos opcionais, combinam com AND):
 *   - search: busca textual em nome/sobrenome/celular/CEP (retro-compat)
 *   - nome: contains case-insensitive em nome OU sobrenome
 *   - telefone: contains em celular (digits)
 *   - status: conta TEM ao menos um lead com esse status (lead.status exato)
 *   - filialId: conta TEM ao menos um lead nessa filial
 *   - userId: conta TEM ao menos um lead com esse vendedor
 *   - dataInicio / dataFim: account.createdAt no range (ISO ou Date)
 *
 * Scoping: non-ADM só vê contas com leads na própria filial.
 * Quando filialId é passado E o usuário não-ADM tem filial diferente,
 * o non-ADM continua restrito à dele (filialId é ignorado em favor do scope).
 */
export async function listAccounts(filters = {}, user) {
  const {
    search,
    nome,
    telefone,
    status,
    filialId,
    userId,
    dataInicio,
    dataFim,
    page = 1,
    limit = 50,
  } = filters;

  const where = {};

  // Busca textual ampla (retro-compat com a UI antiga)
  if (search) {
    where.OR = [
      { nome: { contains: search, mode: 'insensitive' } },
      { sobrenome: { contains: search, mode: 'insensitive' } },
      { celular: { contains: search } },
      { cep: { contains: search } },
    ];
  }

  // Filtro de nome estruturado (UI nova) — sobrescreve OR só se search ausente
  if (nome && !search) {
    where.OR = [
      { nome: { contains: nome, mode: 'insensitive' } },
      { sobrenome: { contains: nome, mode: 'insensitive' } },
    ];
  }

  if (telefone) {
    const digits = String(telefone).replace(/\D/g, '');
    if (digits) where.celular = { contains: digits };
  }

  if (dataInicio || dataFim) {
    where.createdAt = {};
    if (dataInicio) where.createdAt.gte = new Date(dataInicio);
    if (dataFim) where.createdAt.lte = new Date(dataFim);
  }

  // Filtros que dependem de leads vinculados.
  // Se non-ADM, força filial da sessão; ignora filialId arbitrário do query.
  const leadSomeWhere = {};
  if (status) leadSomeWhere.status = status;
  if (userId) {
    const uid = parseInt(userId, 10);
    if (Number.isInteger(uid)) leadSomeWhere.vendedorId = uid;
  }

  if (!isAdm(user) && user?.filialId) {
    leadSomeWhere.filialId = user.filialId;
  } else if (filialId) {
    const fid = parseInt(filialId, 10);
    if (Number.isInteger(fid)) leadSomeWhere.filialId = fid;
  }

  if (Object.keys(leadSomeWhere).length > 0) {
    where.leads = { some: leadSomeWhere };
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const take = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (pageNum - 1) * take;

  const [data, total] = await Promise.all([
    prisma.account.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        leads: {
          select: { id: true, nome: true, status: true, etapa: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { leads: true } },
      },
      skip,
      take,
    }),
    prisma.account.count({ where }),
  ]);

  return { data, total, page: pageNum, limit: take, totalPages: Math.ceil(total / take) };
}

export async function getAccountById(id, user) {
  const account = await prisma.account.findUnique({
    where: { id: parseInt(id, 10) },
    include: {
      leads: {
        include: {
          preVendedor: { select: { id: true, nome: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      _count: { select: { leads: true } },
    },
  });

  if (!account) throw new AppError('Conta não encontrada.', 404);

  // Scoping: non-ADM só vê account se tiver lead na sua filial
  if (!isAdm(user) && user?.filialId) {
    const hasAccessibleLead = account.leads.some(l => l.filialId === user.filialId);
    if (!hasAccessibleLead) throw new AppError('Conta não encontrada.', 404);
  }

  return account;
}
