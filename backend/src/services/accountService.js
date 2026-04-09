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

/**
 * Listagem de contas — somente leitura, para a tela de visualização.
 */
export async function listAccounts({ search, page = 1, limit = 50 }) {
  const where = {};

  if (search) {
    where.OR = [
      { nome: { contains: search, mode: 'insensitive' } },
      { sobrenome: { contains: search, mode: 'insensitive' } },
      { celular: { contains: search } },
      { cep: { contains: search } },
    ];
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

export async function getAccountById(id) {
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
  return account;
}
