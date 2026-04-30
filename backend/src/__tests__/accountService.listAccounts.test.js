import { describe, it, expect, vi, beforeEach } from 'vitest';

// Testa filtros de listAccounts. Mockamos prisma para inspecionar o `where`
// gerado — assertions sobre a query, não sobre dados de fixture.

const mockPrisma = {
  account: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
};

vi.mock('../config/prisma.js', () => ({ default: mockPrisma }));

const { listAccounts } = await import('../services/accountService.js');

const ADM_USER = { id: 1, role: 'ADM', permissions: ['*'] };
const VENDEDOR_FIL_5 = { id: 7, role: 'Vendedor', permissions: [], filialId: 5 };

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.account.findMany.mockResolvedValue([]);
  mockPrisma.account.count.mockResolvedValue(0);
});

function getWhere() {
  return mockPrisma.account.findMany.mock.calls[0][0].where;
}

describe('listAccounts — filtros', () => {
  it('sem filtros: ADM enxerga todas (where vazio)', async () => {
    await listAccounts({}, ADM_USER);
    expect(getWhere()).toEqual({});
  });

  it('non-ADM com filial: força leads.some.filialId', async () => {
    await listAccounts({}, VENDEDOR_FIL_5);
    expect(getWhere()).toEqual({ leads: { some: { filialId: 5 } } });
  });

  it('search: aplica OR em nome/sobrenome/celular/CEP (retro-compat)', async () => {
    await listAccounts({ search: 'Maria' }, ADM_USER);
    expect(getWhere().OR).toEqual([
      { nome: { contains: 'Maria', mode: 'insensitive' } },
      { sobrenome: { contains: 'Maria', mode: 'insensitive' } },
      { celular: { contains: 'Maria' } },
      { cep: { contains: 'Maria' } },
    ]);
  });

  it('nome (sem search): aplica OR só em nome/sobrenome', async () => {
    await listAccounts({ nome: 'Silva' }, ADM_USER);
    expect(getWhere().OR).toEqual([
      { nome: { contains: 'Silva', mode: 'insensitive' } },
      { sobrenome: { contains: 'Silva', mode: 'insensitive' } },
    ]);
  });

  it('search tem precedência sobre nome quando ambos vêm', async () => {
    await listAccounts({ search: 'X', nome: 'Y' }, ADM_USER);
    const where = getWhere();
    expect(where.OR).toHaveLength(4); // OR do search, não do nome
  });

  it('telefone: extrai digits e aplica contains', async () => {
    await listAccounts({ telefone: '(11) 99988-7766' }, ADM_USER);
    expect(getWhere().celular).toEqual({ contains: '11999887766' });
  });

  it('telefone vazio (só pontuação): ignora', async () => {
    await listAccounts({ telefone: '() -' }, ADM_USER);
    expect(getWhere().celular).toBeUndefined();
  });

  it('dataInicio + dataFim: monta range em createdAt', async () => {
    const start = '2026-04-01T00:00:00Z';
    const end = '2026-04-30T23:59:59Z';
    await listAccounts({ dataInicio: start, dataFim: end }, ADM_USER);
    expect(getWhere().createdAt).toEqual({
      gte: new Date(start),
      lte: new Date(end),
    });
  });

  it('status: filtra contas que tenham lead com esse status', async () => {
    await listAccounts({ status: 'Venda' }, ADM_USER);
    expect(getWhere().leads).toEqual({ some: { status: 'Venda' } });
  });

  it('userId: filtra contas que tenham lead com esse vendedor', async () => {
    await listAccounts({ userId: '12' }, ADM_USER);
    expect(getWhere().leads).toEqual({ some: { vendedorId: 12 } });
  });

  it('filialId (ADM): aplica leads.some.filialId do query', async () => {
    await listAccounts({ filialId: '3' }, ADM_USER);
    expect(getWhere().leads).toEqual({ some: { filialId: 3 } });
  });

  it('filialId arbitrário ignorado para non-ADM (sempre força a filial da sessão)', async () => {
    await listAccounts({ filialId: '99' }, VENDEDOR_FIL_5);
    expect(getWhere().leads).toEqual({ some: { filialId: 5 } });
  });

  it('combinação: status + filialId + userId entram no mesmo leads.some', async () => {
    await listAccounts({ status: 'Venda', filialId: '3', userId: '7' }, ADM_USER);
    expect(getWhere().leads).toEqual({
      some: { status: 'Venda', filialId: 3, vendedorId: 7 },
    });
  });

  it('paginação: clamp em 1..200, default 50', async () => {
    await listAccounts({ page: '0', limit: '500' }, ADM_USER);
    const args = mockPrisma.account.findMany.mock.calls[0][0];
    expect(args.take).toBe(200);
    expect(args.skip).toBe(0); // page=0 vira 1, skip=(1-1)*200=0
  });

  it('inclui leads + _count no findMany', async () => {
    await listAccounts({}, ADM_USER);
    const args = mockPrisma.account.findMany.mock.calls[0][0];
    expect(args.include).toMatchObject({
      leads: expect.any(Object),
      _count: { select: { leads: true } },
    });
  });

  it('retorna { data, total, page, limit, totalPages }', async () => {
    mockPrisma.account.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    mockPrisma.account.count.mockResolvedValue(72);
    const result = await listAccounts({ page: '2', limit: '10' }, ADM_USER);
    expect(result).toEqual({
      data: [{ id: 1 }, { id: 2 }],
      total: 72,
      page: 2,
      limit: 10,
      totalPages: 8, // ceil(72/10)
    });
  });
});
