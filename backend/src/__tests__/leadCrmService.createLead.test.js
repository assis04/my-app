import { describe, it, expect, vi, beforeEach } from 'vitest';

// Testa o fluxo canônico unificado (Task #21). Mockamos Prisma,
// findOrMatchAccount, leadHistoryService e as funções de fila.

const mockPrisma = {
  $transaction: vi.fn(async (fn) => fn(mockPrisma)),
  lead: {
    create: vi.fn(),
    findFirst: vi.fn(),
  },
  kanbanCard: {
    aggregate: vi.fn(),
    create: vi.fn(),
  },
  leadHistory: {
    create: vi.fn(),
  },
};

const mockFindOrMatchAccount = vi.fn();
const mockPickNext = vi.fn();
const mockAssertSeller = vi.fn();
const mockRotate = vi.fn();

vi.mock('../config/prisma.js', () => ({ default: mockPrisma }));
vi.mock('../services/accountService.js', () => ({
  findOrMatchAccount: mockFindOrMatchAccount,
}));
vi.mock('../services/queueAssignmentService.js', () => ({
  pickNextAvailableSeller: mockPickNext,
  assertSellerOnQueue: mockAssertSeller,
  rotateQueueAfterAssignment: mockRotate,
}));

const { createLead } = await import('../services/leadCrmService.js');
const { LeadEventType } = await import('../domain/leadEvents.js');

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
  mockPrisma.lead.create.mockImplementation(({ data }) => ({ id: 777, ...data }));
  mockPrisma.kanbanCard.aggregate.mockResolvedValue({ _max: { posicao: 0 } });
  mockPrisma.kanbanCard.create.mockImplementation(({ data }) => ({ id: 50, ...data }));
  mockPrisma.leadHistory.create.mockImplementation(({ data }) => ({ id: 1, ...data }));
  mockFindOrMatchAccount.mockResolvedValue({ account: { id: 100, nome: 'Conta X' } });
  mockPickNext.mockResolvedValue(9);
  mockAssertSeller.mockResolvedValue({ userId: 9 });
});

describe('createLead — validação', () => {
  it('rejeita quando nome ou celular ausente', async () => {
    await expect(createLead({ celular: '11999' })).rejects.toThrow(/obrigatórios/);
    await expect(createLead({ nome: 'X' })).rejects.toThrow(/obrigatórios/);
  });

  it('rejeita queue sem filialId', async () => {
    await expect(
      createLead({ nome: 'X', celular: '11999999999' }, null, { assignmentStrategy: 'queue' }),
    ).rejects.toThrow(/filialId.*queue/);
  });

  it('rejeita manual sem filialId ou assignedUserId', async () => {
    await expect(
      createLead({ nome: 'X', celular: '11999999999' }, null, { assignmentStrategy: 'manual', filialId: 3 }),
    ).rejects.toThrow(/assignedUserId/);
    await expect(
      createLead({ nome: 'X', celular: '11999999999' }, null, { assignmentStrategy: 'manual', assignedUserId: 7 }),
    ).rejects.toThrow(/filialId/);
  });
});

describe('createLead — pipeline canônico (nunca lê status/etapa de data)', () => {
  it('força status="Em prospecção" e etapa="Prospecção" mesmo se data envia outros valores', async () => {
    await createLead({
      nome: 'X',
      celular: '11999999999',
      cep: '01000000',
      status: 'Ativo',       // valor legado — DEVE ser ignorado
      etapa: 'Random',       // idem
    });
    const createData = mockPrisma.lead.create.mock.calls[0][0].data;
    expect(createData.status).toBe('Em prospecção');
    expect(createData.etapa).toBe('Prospecção');
  });
});

describe('createLead — findOrMatchAccount', () => {
  it('chama findOrMatchAccount apenas quando cep presente', async () => {
    await createLead({ nome: 'X', celular: '11999999999', cep: '01000000' });
    expect(mockFindOrMatchAccount).toHaveBeenCalled();
    expect(mockPrisma.lead.create.mock.calls[0][0].data.contaId).toBe(100);
  });

  it('pula findOrMatchAccount e seta contaId=null quando cep ausente', async () => {
    await createLead({ nome: 'X', celular: '11999999999' });
    expect(mockFindOrMatchAccount).not.toHaveBeenCalled();
    expect(mockPrisma.lead.create.mock.calls[0][0].data.contaId).toBeNull();
  });
});

describe('createLead — assignmentStrategy="crm" (default)', () => {
  it('NÃO toca na fila', async () => {
    await createLead({ nome: 'X', celular: '11999999999', cep: '01000000', preVendedorId: 5 });
    expect(mockPickNext).not.toHaveBeenCalled();
    expect(mockAssertSeller).not.toHaveBeenCalled();
    expect(mockRotate).not.toHaveBeenCalled();
  });

  it('usa preVendedorId de data; vendedorId fica null', async () => {
    await createLead({ nome: 'X', celular: '11999999999', cep: '01000000', preVendedorId: 5 });
    const createData = mockPrisma.lead.create.mock.calls[0][0].data;
    expect(createData.preVendedorId).toBe(5);
    expect(createData.vendedorId).toBeNull();
  });

  it('fonte default = "crm"', async () => {
    await createLead({ nome: 'X', celular: '11999999999', cep: '01000000' });
    expect(mockPrisma.lead.create.mock.calls[0][0].data.fonte).toBe('crm');
  });
});

describe('createLead — assignmentStrategy="queue"', () => {
  it('pega próximo vendedor disponível e rotaciona fila', async () => {
    await createLead(
      { nome: 'X', celular: '11999999999', cep: '01000000' },
      null,
      { assignmentStrategy: 'queue', filialId: 3 },
    );
    expect(mockPickNext).toHaveBeenCalledWith(3, mockPrisma);
    expect(mockRotate).toHaveBeenCalledWith(3, 9, mockPrisma);
    expect(mockPrisma.lead.create.mock.calls[0][0].data.vendedorId).toBe(9);
    expect(mockPrisma.lead.create.mock.calls[0][0].data.filialId).toBe(3);
  });

  it('fonte default = "fila" para strategy queue', async () => {
    await createLead(
      { nome: 'X', celular: '11999999999' },
      null,
      { assignmentStrategy: 'queue', filialId: 3 },
    );
    expect(mockPrisma.lead.create.mock.calls[0][0].data.fonte).toBe('fila');
  });
});

describe('createLead — assignmentStrategy="manual"', () => {
  it('valida vendedor na fila, não chama pickNext, e rotaciona', async () => {
    await createLead(
      { nome: 'X', celular: '11999999999' },
      null,
      { assignmentStrategy: 'manual', filialId: 3, assignedUserId: 7 },
    );
    expect(mockAssertSeller).toHaveBeenCalledWith(3, 7, mockPrisma);
    expect(mockPickNext).not.toHaveBeenCalled();
    expect(mockRotate).toHaveBeenCalledWith(3, 7, mockPrisma);
    expect(mockPrisma.lead.create.mock.calls[0][0].data.vendedorId).toBe(7);
  });
});

describe('createLead — KanbanCard', () => {
  it('cria KanbanCard 1:1 na coluna Prospecção com posicao = MAX+1', async () => {
    mockPrisma.kanbanCard.aggregate.mockResolvedValue({ _max: { posicao: 12 } });
    const r = await createLead({ nome: 'X', celular: '11999999999', cep: '01000000' });

    expect(mockPrisma.kanbanCard.create).toHaveBeenCalledWith({
      data: { leadId: 777, coluna: 'Prospecção', posicao: 13 },
    });
    expect(r.kanbanCard).toBeDefined();
    expect(r.kanbanCard.leadId).toBe(777);
  });

  it('inicia posicao em 1 quando coluna está vazia', async () => {
    mockPrisma.kanbanCard.aggregate.mockResolvedValue({ _max: { posicao: null } });
    await createLead({ nome: 'X', celular: '11999999999' });
    expect(mockPrisma.kanbanCard.create.mock.calls[0][0].data.posicao).toBe(1);
  });
});

describe('createLead — LeadHistory', () => {
  it('registra note_added para origem interna (origemExterna=false)', async () => {
    await createLead({ nome: 'X', celular: '11999999999' }, { id: 42 }, { assignmentStrategy: 'crm' });

    const historyCall = mockPrisma.leadHistory.create.mock.calls[0][0].data;
    expect(historyCall.eventType).toBe(LeadEventType.NOTE_ADDED);
    expect(historyCall.authorUserId).toBe(42);
    expect(historyCall.payload.text).toContain('crm');
  });

  it('registra external_created quando origemExterna=true', async () => {
    await createLead({
      nome: 'X',
      celular: '11999999999',
      origemExterna: true,
      fonte: 'whatsapp',
    });

    const historyCall = mockPrisma.leadHistory.create.mock.calls[0][0].data;
    expect(historyCall.eventType).toBe(LeadEventType.EXTERNAL_CREATED);
    expect(historyCall.authorUserId).toBeNull();
    expect(historyCall.payload.source).toBe('whatsapp');
  });
});

describe('createLead — retorno', () => {
  it('retorna lead com kanbanCard incorporado', async () => {
    const r = await createLead({ nome: 'X', celular: '11999999999', cep: '01000000' });
    expect(r.id).toBe(777);
    expect(r.kanbanCard).toBeDefined();
  });
});
