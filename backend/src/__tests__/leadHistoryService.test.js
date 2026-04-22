import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma antes de importar o serviço
const mockPrisma = {
  leadHistory: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
};

vi.mock('../config/prisma.js', () => ({ default: mockPrisma }));

const { add, listByLead, listByLeadPaginated, leadHistoryService } = await import(
  '../services/leadHistoryService.js'
);
const { LeadEventType } = await import('../domain/leadEvents.js');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('leadHistoryService.add() — validações', () => {
  it('rejeita parâmetros não-objeto', async () => {
    await expect(add(null)).rejects.toThrow(/Parâmetros inválidos/);
    await expect(add('string')).rejects.toThrow(/Parâmetros inválidos/);
  });

  it('rejeita leadId não-inteiro ou não-positivo', async () => {
    await expect(add({ leadId: 'abc', eventType: LeadEventType.NOTE_ADDED, payload: { text: 'x' } }))
      .rejects.toThrow(/leadId/);
    await expect(add({ leadId: 0, eventType: LeadEventType.NOTE_ADDED, payload: { text: 'x' } }))
      .rejects.toThrow(/leadId/);
    await expect(add({ leadId: -5, eventType: LeadEventType.NOTE_ADDED, payload: { text: 'x' } }))
      .rejects.toThrow(/leadId/);
    await expect(add({ leadId: 1.5, eventType: LeadEventType.NOTE_ADDED, payload: { text: 'x' } }))
      .rejects.toThrow(/leadId/);
  });

  it('rejeita eventType inválido', async () => {
    await expect(add({ leadId: 1, eventType: 'bogus_event', payload: {} }))
      .rejects.toThrow(/Tipo de evento inválido/);
    await expect(add({ leadId: 1, eventType: null, payload: {} }))
      .rejects.toThrow(/Tipo de evento inválido/);
  });

  it('rejeita payload com chaves obrigatórias ausentes (status_changed sem from/to)', async () => {
    await expect(add({ leadId: 1, eventType: LeadEventType.STATUS_CHANGED, payload: { from: 'X' } }))
      .rejects.toThrow(/chaves obrigatórias ausentes.*to/);
  });

  it('aceita evento sem chaves obrigatórias (lead_reactivated tem payload vazio)', async () => {
    mockPrisma.leadHistory.create.mockResolvedValue({ id: 1 });
    await expect(add({ leadId: 1, eventType: LeadEventType.LEAD_REACTIVATED }))
      .resolves.toEqual({ id: 1 });
  });
});

describe('leadHistoryService.add() — happy path', () => {
  it('cria evento com authorUserId quando informado', async () => {
    mockPrisma.leadHistory.create.mockResolvedValue({
      id: 42,
      leadId: 10,
      authorUserId: 7,
      eventType: LeadEventType.STATUS_CHANGED,
      payload: { from: 'Em prospecção', to: 'Venda' },
    });

    const result = await add({
      leadId: 10,
      authorUserId: 7,
      eventType: LeadEventType.STATUS_CHANGED,
      payload: { from: 'Em prospecção', to: 'Venda' },
    });

    expect(result.id).toBe(42);
    expect(mockPrisma.leadHistory.create).toHaveBeenCalledWith({
      data: {
        leadId: 10,
        authorUserId: 7,
        eventType: 'status_changed',
        payload: { from: 'Em prospecção', to: 'Venda' },
      },
    });
  });

  it('defaulta authorUserId para null (evento originado por sistema)', async () => {
    mockPrisma.leadHistory.create.mockResolvedValue({ id: 1 });

    await add({
      leadId: 10,
      eventType: LeadEventType.EXTERNAL_CREATED,
      payload: { source: 'whatsapp' },
    });

    expect(mockPrisma.leadHistory.create).toHaveBeenCalledWith({
      data: {
        leadId: 10,
        authorUserId: null,
        eventType: 'external_created',
        payload: { source: 'whatsapp' },
      },
    });
  });

  it('normaliza leadId string para inteiro', async () => {
    mockPrisma.leadHistory.create.mockResolvedValue({ id: 1 });

    await add({
      leadId: '10',
      eventType: LeadEventType.LEAD_REACTIVATED,
    });

    expect(mockPrisma.leadHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ leadId: 10 }),
    });
  });

  it('usa o tx passado em vez do prisma global (participação em transação)', async () => {
    const mockTx = {
      leadHistory: { create: vi.fn().mockResolvedValue({ id: 99 }) },
    };

    await add(
      { leadId: 1, eventType: LeadEventType.NOTE_ADDED, payload: { text: 'hi' } },
      mockTx,
    );

    expect(mockTx.leadHistory.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.leadHistory.create).not.toHaveBeenCalled();
  });
});

describe('leadHistoryService.listByLead()', () => {
  it('retorna eventos em ordem cronológica descendente com include do autor', async () => {
    const fake = [
      { id: 2, createdAt: new Date('2026-04-20'), authorUser: { id: 5, nome: 'Ana' } },
      { id: 1, createdAt: new Date('2026-04-19'), authorUser: null },
    ];
    mockPrisma.leadHistory.findMany.mockResolvedValue(fake);

    const result = await listByLead(10);

    expect(result).toEqual(fake);
    expect(mockPrisma.leadHistory.findMany).toHaveBeenCalledWith({
      where: { leadId: 10 },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { authorUser: { select: { id: true, nome: true } } },
    });
  });

  it('clampa limit acima do máximo para 200', async () => {
    mockPrisma.leadHistory.findMany.mockResolvedValue([]);
    await listByLead(1, { limit: 9999 });
    expect(mockPrisma.leadHistory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 200 }),
    );
  });

  it('clampa limit abaixo do mínimo para 1', async () => {
    mockPrisma.leadHistory.findMany.mockResolvedValue([]);
    await listByLead(1, { limit: 0 });
    // limit=0 é inválido → cai no default de 50
    expect(mockPrisma.leadHistory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 }),
    );
  });

  it('rejeita leadId inválido', async () => {
    await expect(listByLead('abc')).rejects.toThrow(/leadId/);
  });
});

describe('leadHistoryService.listByLeadPaginated()', () => {
  it('sem cursor: retorna primeira página com nextCursor quando há mais', async () => {
    // 3 items + limit=2 → 1 extra indica que tem mais
    const fake = [
      { id: 100, createdAt: new Date(), authorUser: null },
      { id: 99, createdAt: new Date(), authorUser: null },
      { id: 98, createdAt: new Date(), authorUser: null },
    ];
    mockPrisma.leadHistory.findMany.mockResolvedValue(fake);

    const result = await listByLeadPaginated(1, { limit: 2 });

    expect(result.items).toHaveLength(2);
    expect(result.items.map((i) => i.id)).toEqual([100, 99]);
    expect(result.nextCursor).toBe(99);
  });

  it('sem cursor: última página retorna nextCursor=null', async () => {
    mockPrisma.leadHistory.findMany.mockResolvedValue([{ id: 2 }, { id: 1 }]);
    const result = await listByLeadPaginated(1, { limit: 50 });
    expect(result.nextCursor).toBeNull();
  });

  it('com cursor: aplica skip:1 para pular o item apontado pelo cursor', async () => {
    mockPrisma.leadHistory.findMany.mockResolvedValue([]);
    await listByLeadPaginated(1, { cursor: 99, limit: 10 });

    expect(mockPrisma.leadHistory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: 99 },
        skip: 1,
        take: 11, // limit+1
      }),
    );
  });

  it('rejeita cursor inválido', async () => {
    await expect(listByLeadPaginated(1, { cursor: 'abc' })).rejects.toThrow(/cursor/);
    await expect(listByLeadPaginated(1, { cursor: -1 })).rejects.toThrow(/cursor/);
  });
});

describe('leadHistoryService — contrato append-only', () => {
  it('expõe apenas add, listByLead, listByLeadPaginated — sem update/delete', () => {
    const keys = Object.keys(leadHistoryService);
    expect(keys.sort()).toEqual(['add', 'listByLead', 'listByLeadPaginated']);
    expect(leadHistoryService.update).toBeUndefined();
    expect(leadHistoryService.delete).toBeUndefined();
    expect(leadHistoryService.remove).toBeUndefined();
  });

  it('fachada está congelada (tentativa de adicionar função nova não persiste)', () => {
    expect(Object.isFrozen(leadHistoryService)).toBe(true);
    // Em strict mode isso lança; em non-strict apenas ignora
    expect(() => {
      leadHistoryService.update = () => {};
    }).toThrow();
    expect(leadHistoryService.update).toBeUndefined();
  });
});
