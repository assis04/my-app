import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────────────
// Para testar QUE o lock está aplicado e com os parâmetros certos, mockamos
// withQueueLock e o prisma. O mock de withQueueLock registra as chamadas e
// executa a fn recebida — simula lock adquirido com sucesso.

const mockWithQueueLock = vi.fn();

vi.mock('../utils/redisLock.js', () => ({
  withQueueLock: mockWithQueueLock,
}));

const mockPrisma = {
  $queryRaw: vi.fn().mockResolvedValue([]),
  $transaction: vi.fn(async (fn) => fn(mockPrisma)),
  $executeRaw: vi.fn().mockResolvedValue(1),
  salesQueue: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  lead: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
};

vi.mock('../config/prisma.js', () => ({ default: mockPrisma }));
vi.mock('./accountService.js', () => ({ findOrMatchAccount: vi.fn() }));
vi.mock('../services/accountService.js', () => ({
  findOrMatchAccount: vi.fn().mockResolvedValue({ account: { id: 100 } }),
}));

const { assignLeadQuick, assignLeadManual } = await import('../services/leadService.js');

beforeEach(() => {
  vi.clearAllMocks();

  // Default: lock é adquirido e fn é executada
  mockWithQueueLock.mockImplementation(async (_branchId, fn) => fn());

  mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));

  mockPrisma.salesQueue.findMany.mockResolvedValue([
    { filialId: 3, userId: 7, position: 1, isAvailable: true },
  ]);
  mockPrisma.salesQueue.findUnique.mockResolvedValue({ filialId: 3, userId: 7 });
  mockPrisma.salesQueue.update.mockResolvedValue({});
  mockPrisma.user.findUnique.mockResolvedValue({ id: 7, nome: 'Vendedor Teste' });
  mockPrisma.lead.findFirst.mockResolvedValue(null); // sem duplicata
  mockPrisma.lead.create.mockImplementation(({ data }) => ({ id: 999, ...data }));
});

describe('assignLeadQuick — lock da fila', () => {
  it('chama withQueueLock com o branchId correto', async () => {
    await assignLeadQuick(3, { telefone: '11999999999', nome: 'X', cep: '01000000' });
    expect(mockWithQueueLock).toHaveBeenCalledTimes(1);
    expect(mockWithQueueLock).toHaveBeenCalledWith(3, expect.any(Function));
  });

  it('normaliza branchId string para int antes de passar ao lock', async () => {
    await assignLeadQuick('3', { telefone: '11999999999', nome: 'X', cep: '01000000' });
    expect(mockWithQueueLock).toHaveBeenCalledWith(3, expect.any(Function));
  });

  it('rejeita branchId inválido ANTES de tentar adquirir lock', async () => {
    await expect(
      assignLeadQuick('abc', { telefone: '11999999999' }),
    ).rejects.toThrow(/filial inválido/);
    expect(mockWithQueueLock).not.toHaveBeenCalled();
  });

  it('a transação Prisma roda DENTRO do lock (ordem)', async () => {
    await assignLeadQuick(3, { telefone: '11999999999', nome: 'X', cep: '01000000' });
    // O lock foi chamado antes da transação
    const lockOrder = mockWithQueueLock.mock.invocationCallOrder[0];
    const txOrder = mockPrisma.$transaction.mock.invocationCallOrder[0];
    expect(lockOrder).toBeLessThan(txOrder);
  });

  it('propaga 409 quando withQueueLock rejeita por lock ocupado', async () => {
    const conflict = new Error('Recurso em uso, tente novamente.');
    conflict.statusCode = 409;
    mockWithQueueLock.mockRejectedValueOnce(conflict);

    await expect(
      assignLeadQuick(3, { telefone: '11999999999', nome: 'X', cep: '01000000' }),
    ).rejects.toMatchObject({ statusCode: 409 });

    // Nada de transação aconteceu — protegido pelo lock
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('assignLeadManual — lock da fila', () => {
  it('chama withQueueLock com o branchId correto', async () => {
    await assignLeadManual(3, { telefone: '11999999999', nome: 'X', cep: '01000000' }, 7);
    expect(mockWithQueueLock).toHaveBeenCalledWith(3, expect.any(Function));
  });

  it('rejeita IDs inválidos ANTES de tentar adquirir lock', async () => {
    await expect(
      assignLeadManual('abc', { telefone: '11999999999' }, 7),
    ).rejects.toThrow(/inválidos/);
    await expect(
      assignLeadManual(3, { telefone: '11999999999' }, 'xyz'),
    ).rejects.toThrow(/inválidos/);
    expect(mockWithQueueLock).not.toHaveBeenCalled();
  });

  it('propaga 409 quando lock está ocupado', async () => {
    const conflict = new Error('Recurso em uso, tente novamente.');
    conflict.statusCode = 409;
    mockWithQueueLock.mockRejectedValueOnce(conflict);

    await expect(
      assignLeadManual(3, { telefone: '11999999999', nome: 'X', cep: '01000000' }, 7),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('assignLead* — filial distinta → locks independentes', () => {
  it('duas atribuições em filiais diferentes adquirem locks diferentes', async () => {
    await assignLeadQuick(3, { telefone: '11999999999', nome: 'A', cep: '01000000' });
    await assignLeadQuick(5, { telefone: '11888888888', nome: 'B', cep: '02000000' });

    const branches = mockWithQueueLock.mock.calls.map((c) => c[0]);
    expect(branches).toEqual([3, 5]);
  });
});
