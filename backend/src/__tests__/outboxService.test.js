import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  outbox: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock('../config/prisma.js', () => ({ default: mockPrisma }));

const {
  enqueue,
  fetchPending,
  markDone,
  markFailed,
  outboxService,
  OutboxStatus,
  DEFAULT_MAX_ATTEMPTS,
} = await import('../services/outboxService.js');

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.outbox.create.mockImplementation(({ data }) => ({ id: 1, ...data }));
  mockPrisma.outbox.update.mockImplementation(({ data }) => ({ id: 1, ...data }));
});

describe('enqueue() — validações', () => {
  it('rejeita params nulo', async () => {
    await expect(enqueue(null)).rejects.toThrow(/Parâmetros inválidos/);
  });

  it('rejeita aggregate ausente ou vazio', async () => {
    await expect(
      enqueue({ aggregate: '', aggregateId: 1, eventType: 'x' }),
    ).rejects.toThrow(/aggregate/);
    await expect(
      enqueue({ aggregateId: 1, eventType: 'x' }),
    ).rejects.toThrow(/aggregate/);
  });

  it('rejeita aggregateId inválido', async () => {
    await expect(
      enqueue({ aggregate: 'lead', aggregateId: 0, eventType: 'x' }),
    ).rejects.toThrow(/aggregateId/);
    await expect(
      enqueue({ aggregate: 'lead', aggregateId: 'abc', eventType: 'x' }),
    ).rejects.toThrow(/aggregateId/);
  });

  it('rejeita eventType ausente ou vazio', async () => {
    await expect(
      enqueue({ aggregate: 'lead', aggregateId: 1, eventType: '' }),
    ).rejects.toThrow(/eventType/);
    await expect(
      enqueue({ aggregate: 'lead', aggregateId: 1 }),
    ).rejects.toThrow(/eventType/);
  });
});

describe('enqueue() — happy path', () => {
  it('insere com status=pending e attempts=0', async () => {
    await enqueue({
      aggregate: 'lead',
      aggregateId: 10,
      eventType: 'agenda_open',
      payload: { tipo: 'video_chamada' },
    });

    expect(mockPrisma.outbox.create).toHaveBeenCalledWith({
      data: {
        aggregate: 'lead',
        aggregateId: 10,
        eventType: 'agenda_open',
        payload: { tipo: 'video_chamada' },
        status: 'pending',
        attempts: 0,
      },
    });
  });

  it('payload defaulta para {} quando ausente', async () => {
    await enqueue({ aggregate: 'lead', aggregateId: 10, eventType: 'x' });
    expect(mockPrisma.outbox.create.mock.calls[0][0].data.payload).toEqual({});
  });

  it('usa o tx passado em vez do prisma global (participação em transação)', async () => {
    const mockTx = {
      outbox: { create: vi.fn().mockResolvedValue({ id: 50 }) },
    };
    await enqueue(
      { aggregate: 'lead', aggregateId: 1, eventType: 'x' },
      mockTx,
    );
    expect(mockTx.outbox.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.outbox.create).not.toHaveBeenCalled();
  });

  it('normaliza aggregateId string para inteiro', async () => {
    await enqueue({ aggregate: 'lead', aggregateId: '10', eventType: 'x' });
    expect(mockPrisma.outbox.create.mock.calls[0][0].data.aggregateId).toBe(10);
  });
});

describe('fetchPending()', () => {
  it('lista apenas pending ordenado por createdAt ASC (FIFO)', async () => {
    mockPrisma.outbox.findMany.mockResolvedValue([{ id: 1 }]);
    await fetchPending();
    expect(mockPrisma.outbox.findMany).toHaveBeenCalledWith({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });
  });

  it('clampa limit no range [1, 100]', async () => {
    mockPrisma.outbox.findMany.mockResolvedValue([]);

    await fetchPending({ limit: 0 });
    expect(mockPrisma.outbox.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ take: 10 }), // 0 é inválido → default
    );

    await fetchPending({ limit: 9999 });
    expect(mockPrisma.outbox.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ take: 100 }),
    );

    await fetchPending({ limit: 50 });
    expect(mockPrisma.outbox.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ take: 50 }),
    );
  });
});

describe('markDone()', () => {
  it('seta status=done + processedAt + limpa lastError', async () => {
    await markDone(42);
    expect(mockPrisma.outbox.update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: {
        status: 'done',
        processedAt: expect.any(Date),
        lastError: null,
      },
    });
  });

  it('rejeita id inválido', async () => {
    await expect(markDone(0)).rejects.toThrow(/id/);
    await expect(markDone('abc')).rejects.toThrow(/id/);
  });
});

describe('markFailed() — retry com backoff', () => {
  it('incrementa attempts e grava lastError; mantém status=pending quando < maxAttempts', async () => {
    mockPrisma.outbox.findUnique.mockResolvedValue({ id: 1, attempts: 0 });
    await markFailed(1, new Error('agenda fora do ar'));

    expect(mockPrisma.outbox.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        attempts: 1,
        lastError: 'Error: agenda fora do ar',
        status: 'pending',
      },
    });
  });

  it('transiciona para status=failed quando attempts alcança maxAttempts', async () => {
    mockPrisma.outbox.findUnique.mockResolvedValue({ id: 1, attempts: 4 });
    await markFailed(1, new Error('terminou'));

    expect(mockPrisma.outbox.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        attempts: 5,
        lastError: 'Error: terminou',
        status: 'failed',
      },
    });
  });

  it('respeita maxAttempts customizado', async () => {
    mockPrisma.outbox.findUnique.mockResolvedValue({ id: 1, attempts: 2 });
    await markFailed(1, 'erro', { maxAttempts: 3 });
    expect(mockPrisma.outbox.update.mock.calls[0][0].data.status).toBe('failed');
  });

  it('aceita string direta como error', async () => {
    mockPrisma.outbox.findUnique.mockResolvedValue({ id: 1, attempts: 0 });
    await markFailed(1, 'timeout');
    expect(mockPrisma.outbox.update.mock.calls[0][0].data.lastError).toBe('timeout');
  });

  it('trunca lastError em 2000 chars pra evitar payload absurdo', async () => {
    mockPrisma.outbox.findUnique.mockResolvedValue({ id: 1, attempts: 0 });
    const huge = 'x'.repeat(5000);
    await markFailed(1, huge);
    expect(mockPrisma.outbox.update.mock.calls[0][0].data.lastError.length).toBe(2000);
  });

  it('retorna 404 quando id não existe', async () => {
    mockPrisma.outbox.findUnique.mockResolvedValue(null);
    await expect(markFailed(999, 'x')).rejects.toThrow(/não encontrado/);
  });

  it('DEFAULT_MAX_ATTEMPTS é 5 (regra atual do plan)', () => {
    expect(DEFAULT_MAX_ATTEMPTS).toBe(5);
  });
});

describe('outboxService — fachada', () => {
  it('expõe enqueue, fetchPending, markDone, markFailed, OutboxStatus', () => {
    expect(typeof outboxService.enqueue).toBe('function');
    expect(typeof outboxService.fetchPending).toBe('function');
    expect(typeof outboxService.markDone).toBe('function');
    expect(typeof outboxService.markFailed).toBe('function');
    expect(outboxService.OutboxStatus).toBe(OutboxStatus);
  });

  it('está congelada', () => {
    expect(Object.isFrozen(outboxService)).toBe(true);
    expect(Object.isFrozen(OutboxStatus)).toBe(true);
  });
});
