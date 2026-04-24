import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Prisma ────────────────────────────────────────────────────────────

const mockPrisma = {
  $transaction: vi.fn(async (fnOrArr) =>
    typeof fnOrArr === 'function' ? fnOrArr(mockPrisma) : Promise.all(fnOrArr),
  ),
  $executeRaw: vi.fn(),
  lead: {
    findFirst: vi.fn(),
  },
  orcamento: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  leadHistory: {
    create: vi.fn(),
  },
};

vi.mock('../config/prisma.js', () => ({ default: mockPrisma }));

const {
  createOrcamento,
  getOrcamentoById,
  getOrcamentoByLeadId,
  listOrcamentos,
  transitionOrcamentoStatus,
  cancelOrcamento,
  reactivateOrcamento,
} = await import('../services/orcamentoService.js');
const { OrcamentoStatus } = await import('../domain/orcamentoStatus.js');
const { LeadEventType } = await import('../domain/leadEvents.js');
const { LeadStatus } = await import('../domain/leadStatus.js');

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.$transaction.mockImplementation(async (fnOrArr) =>
    typeof fnOrArr === 'function' ? fnOrArr(mockPrisma) : Promise.all(fnOrArr),
  );
  mockPrisma.$executeRaw.mockResolvedValue(1);
  mockPrisma.orcamento.count.mockResolvedValue(0);
  mockPrisma.leadHistory.create.mockImplementation(({ data }) => ({ id: 1, ...data }));
  mockPrisma.orcamento.create.mockImplementation(({ data }) => ({ id: 123, ...data }));
  mockPrisma.orcamento.update.mockImplementation(({ data, where }) => ({ id: where.id, ...data }));
});

// ─── Fixtures ──────────────────────────────────────────────────────────────

const regularUser = { id: 7, role: 'Vendedor', filialId: 1, permissions: ['crm:orcamentos:create'] };
const admUser = { id: 99, role: 'ADM', filialId: null, permissions: ['*'] };
const otherFilialUser = { id: 8, role: 'Vendedor', filialId: 2, permissions: ['crm:orcamentos:read'] };

const leadAtivo = { id: 10, filialId: 1, status: LeadStatus.EM_PROSPECCAO, deletedAt: null, orcamento: null };
const leadCancelado = { ...leadAtivo, status: LeadStatus.CANCELADO };
const leadComOrcamento = { ...leadAtivo, orcamento: { id: 500, numero: 'NON-2026-000005' } };

// ─── createOrcamento ────────────────────────────────────────────────────────

describe('createOrcamento', () => {
  it('cria Orçamento e escreve evento non_generated no histórico', async () => {
    mockPrisma.lead.findFirst.mockResolvedValue(leadAtivo);

    const result = await createOrcamento({ leadId: 10, user: regularUser });

    expect(result).toMatchObject({
      id: 123,
      leadId: 10,
      status: OrcamentoStatus.NOVA,
      criadoPorUserId: 7,
    });
    expect(result.numero).toMatch(/^NON-\d{4}-\d{6}$/);

    const historyCall = mockPrisma.leadHistory.create.mock.calls[0][0].data;
    expect(historyCall.eventType).toBe(LeadEventType.NON_GENERATED);
    expect(historyCall.payload).toMatchObject({ orcamentoId: 123, numero: result.numero });
  });

  it('formato do numero incrementa com o count do ano', async () => {
    mockPrisma.lead.findFirst.mockResolvedValue(leadAtivo);
    mockPrisma.orcamento.count.mockResolvedValue(41);

    const result = await createOrcamento({ leadId: 10, user: regularUser });
    expect(result.numero).toMatch(/-000042$/);
  });

  it('rejeita leadId inválido', async () => {
    await expect(createOrcamento({ leadId: 'abc', user: regularUser })).rejects.toThrow(/leadId/);
    await expect(createOrcamento({ leadId: 0, user: regularUser })).rejects.toThrow(/leadId/);
  });

  it('rejeita sem user autenticado', async () => {
    await expect(createOrcamento({ leadId: 10, user: null })).rejects.toThrow(/autenticado/);
  });

  it('retorna 404 quando Lead não existe', async () => {
    mockPrisma.lead.findFirst.mockResolvedValue(null);
    await expect(createOrcamento({ leadId: 10, user: regularUser }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('retorna 403 quando Lead é de outra filial (não-ADM)', async () => {
    mockPrisma.lead.findFirst.mockResolvedValue(leadAtivo);
    await expect(createOrcamento({ leadId: 10, user: otherFilialUser }))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  it('permite ADM criar em qualquer filial', async () => {
    mockPrisma.lead.findFirst.mockResolvedValue(leadAtivo);
    const result = await createOrcamento({ leadId: 10, user: admUser });
    expect(result).toBeDefined();
  });

  it('retorna 409 quando Lead está em Cancelado', async () => {
    mockPrisma.lead.findFirst.mockResolvedValue(leadCancelado);
    await expect(createOrcamento({ leadId: 10, user: regularUser }))
      .rejects.toMatchObject({ statusCode: 409, message: expect.stringMatching(/Reative/i) });
  });

  it('retorna 409 quando Lead já tem Orçamento vinculado', async () => {
    mockPrisma.lead.findFirst.mockResolvedValue(leadComOrcamento);
    await expect(createOrcamento({ leadId: 10, user: regularUser }))
      .rejects.toMatchObject({ statusCode: 409, message: expect.stringMatching(/NON-2026-000005/) });
  });

  it('traduz P2002 em leadId para 409 amigável (race)', async () => {
    mockPrisma.lead.findFirst.mockResolvedValue(leadAtivo);
    const p2002 = Object.assign(new Error('Unique constraint'), {
      code: 'P2002',
      meta: { target: ['leadId'] },
    });
    mockPrisma.orcamento.create.mockRejectedValueOnce(p2002);

    await expect(createOrcamento({ leadId: 10, user: regularUser }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  it('faz retry no numero quando P2002 bate em numero unique', async () => {
    mockPrisma.lead.findFirst.mockResolvedValue(leadAtivo);
    const p2002Numero = Object.assign(new Error('Unique constraint'), {
      code: 'P2002',
      meta: { target: ['numero'] },
    });
    mockPrisma.orcamento.create
      .mockRejectedValueOnce(p2002Numero)
      .mockImplementationOnce(({ data }) => ({ id: 456, ...data }));

    const result = await createOrcamento({ leadId: 10, user: regularUser });
    expect(result.id).toBe(456);
    expect(mockPrisma.orcamento.create).toHaveBeenCalledTimes(2);
  });
});

// ─── getOrcamentoById ──────────────────────────────────────────────────────

describe('getOrcamentoById', () => {
  it('retorna Orçamento com lead+criadoPor incluídos', async () => {
    const orc = { id: 500, leadId: 10, numero: 'NON-2026-000001', status: OrcamentoStatus.NOVA, lead: leadAtivo, criadoPor: { id: 7, nome: 'Vendedor' } };
    mockPrisma.orcamento.findFirst.mockResolvedValue(orc);

    const result = await getOrcamentoById(500, regularUser);
    expect(result).toEqual(orc);
  });

  it('retorna 404 quando Orçamento não existe', async () => {
    mockPrisma.orcamento.findFirst.mockResolvedValue(null);
    await expect(getOrcamentoById(500, regularUser))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('retorna 403 quando lead é de outra filial (não-ADM)', async () => {
    const orc = { id: 500, lead: leadAtivo };
    mockPrisma.orcamento.findFirst.mockResolvedValue(orc);
    await expect(getOrcamentoById(500, otherFilialUser))
      .rejects.toMatchObject({ statusCode: 403 });
  });
});

// ─── getOrcamentoByLeadId ──────────────────────────────────────────────────

describe('getOrcamentoByLeadId', () => {
  it('retorna null quando Lead não tem Orçamento', async () => {
    mockPrisma.orcamento.findFirst.mockResolvedValue(null);
    const r = await getOrcamentoByLeadId(10, regularUser);
    expect(r).toBeNull();
  });

  it('retorna o Orçamento quando existe', async () => {
    const orc = { id: 500, leadId: 10, numero: 'NON-2026-000001', lead: { id: 10, filialId: 1 } };
    mockPrisma.orcamento.findFirst.mockResolvedValue(orc);
    const r = await getOrcamentoByLeadId(10, regularUser);
    expect(r).toEqual(orc);
  });
});

// ─── listOrcamentos ────────────────────────────────────────────────────────

describe('listOrcamentos', () => {
  it('força filialId do user quando não é ADM', async () => {
    mockPrisma.orcamento.findMany.mockResolvedValue([]);
    mockPrisma.orcamento.count.mockResolvedValue(0);

    await listOrcamentos({ filialId: 99 }, regularUser);

    const findManyCall = mockPrisma.orcamento.findMany.mock.calls[0][0];
    // lead.filialId do user (1), não o que veio no filtro (99)
    expect(findManyCall.where.lead.filialId).toBe(1);
  });

  it('ADM com filialId no filtro passa o valor direto', async () => {
    mockPrisma.orcamento.findMany.mockResolvedValue([]);
    mockPrisma.orcamento.count.mockResolvedValue(0);

    await listOrcamentos({ filialId: 3 }, admUser);
    const call = mockPrisma.orcamento.findMany.mock.calls[0][0];
    expect(call.where.lead.filialId).toBe(3);
  });

  it('paginação default: page=1, limit=50', async () => {
    mockPrisma.orcamento.findMany.mockResolvedValue([]);
    mockPrisma.orcamento.count.mockResolvedValue(0);

    const r = await listOrcamentos({}, admUser);
    expect(r.page).toBe(1);
    expect(r.limit).toBe(50);
  });

  it('calcula totalPages corretamente', async () => {
    mockPrisma.orcamento.findMany.mockResolvedValue([]);
    mockPrisma.orcamento.count.mockResolvedValue(125);

    const r = await listOrcamentos({ limit: 50 }, admUser);
    expect(r.totalPages).toBe(3);
    expect(r.total).toBe(125);
  });
});

// ─── transitionOrcamentoStatus ─────────────────────────────────────────────

describe('transitionOrcamentoStatus', () => {
  it('transita Nova O.N. → Standby e registra histórico', async () => {
    mockPrisma.orcamento.findFirst.mockResolvedValue({
      id: 500,
      leadId: 10,
      numero: 'NON-2026-000001',
      status: OrcamentoStatus.NOVA,
      lead: { id: 10, filialId: 1 },
    });

    const r = await transitionOrcamentoStatus({ id: 500, newStatus: OrcamentoStatus.STANDBY, user: regularUser });
    expect(r.status).toBe(OrcamentoStatus.STANDBY);

    const historyCall = mockPrisma.leadHistory.create.mock.calls[0][0].data;
    expect(historyCall.eventType).toBe(LeadEventType.NON_STATUS_CHANGED);
    expect(historyCall.payload).toMatchObject({
      from: OrcamentoStatus.NOVA,
      to: OrcamentoStatus.STANDBY,
    });
  });

  it('rejeita tentativa de ir pra Cancelado via /status (usa /cancel)', async () => {
    mockPrisma.orcamento.findFirst.mockResolvedValue({
      id: 500,
      leadId: 10,
      status: OrcamentoStatus.NOVA,
      lead: { id: 10, filialId: 1 },
    });

    await expect(transitionOrcamentoStatus({ id: 500, newStatus: OrcamentoStatus.CANCELADO, user: regularUser }))
      .rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/\/cancel/) });
  });

  it('rejeita sair de Cancelado via /status (usa /reactivate)', async () => {
    mockPrisma.orcamento.findFirst.mockResolvedValue({
      id: 500,
      leadId: 10,
      status: OrcamentoStatus.CANCELADO,
      lead: { id: 10, filialId: 1 },
    });

    await expect(transitionOrcamentoStatus({ id: 500, newStatus: OrcamentoStatus.NOVA, user: regularUser }))
      .rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/\/reactivate/) });
  });

  it('retorna 404 quando Orçamento não existe', async () => {
    mockPrisma.orcamento.findFirst.mockResolvedValue(null);
    await expect(transitionOrcamentoStatus({ id: 500, newStatus: OrcamentoStatus.STANDBY, user: regularUser }))
      .rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── cancelOrcamento ───────────────────────────────────────────────────────

describe('cancelOrcamento', () => {
  it('cancela com motivo válido e registra histórico', async () => {
    mockPrisma.orcamento.findFirst.mockResolvedValue({
      id: 500,
      leadId: 10,
      numero: 'NON-2026-000001',
      status: OrcamentoStatus.NOVA,
      lead: { id: 10, filialId: 1 },
    });

    const r = await cancelOrcamento({ id: 500, motivo: 'Comprou na concorrência', user: regularUser });
    expect(r.status).toBe(OrcamentoStatus.CANCELADO);
    expect(r.motivoCancelamento).toBe('Comprou na concorrência');

    const historyCall = mockPrisma.leadHistory.create.mock.calls[0][0].data;
    expect(historyCall.eventType).toBe(LeadEventType.NON_CANCELLED);
    expect(historyCall.payload.motivo).toBe('Comprou na concorrência');
  });

  it('rejeita motivo fora do enum', async () => {
    await expect(cancelOrcamento({ id: 500, motivo: 'qualquer coisa', user: regularUser }))
      .rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/motivo/i) });
  });

  it('rejeita cancelar Orçamento já Cancelado', async () => {
    mockPrisma.orcamento.findFirst.mockResolvedValue({
      id: 500,
      leadId: 10,
      status: OrcamentoStatus.CANCELADO,
      lead: { id: 10, filialId: 1 },
    });

    await expect(cancelOrcamento({ id: 500, motivo: 'Não Responde', user: regularUser }))
      .rejects.toMatchObject({ statusCode: 409 });
  });
});

// ─── reactivateOrcamento ───────────────────────────────────────────────────

describe('reactivateOrcamento', () => {
  it('reativa Cancelado → Nova O.N., limpa motivo, registra histórico', async () => {
    mockPrisma.orcamento.findFirst.mockResolvedValue({
      id: 500,
      leadId: 10,
      numero: 'NON-2026-000001',
      status: OrcamentoStatus.CANCELADO,
      motivoCancelamento: 'Não Responde',
      lead: { id: 10, filialId: 1 },
    });

    const r = await reactivateOrcamento({ id: 500, user: regularUser });
    expect(r.status).toBe(OrcamentoStatus.NOVA);
    expect(r.motivoCancelamento).toBeNull();

    const historyCall = mockPrisma.leadHistory.create.mock.calls[0][0].data;
    expect(historyCall.eventType).toBe(LeadEventType.NON_REACTIVATED);
  });

  it('rejeita reativar Orçamento que não está em Cancelado', async () => {
    mockPrisma.orcamento.findFirst.mockResolvedValue({
      id: 500,
      leadId: 10,
      status: OrcamentoStatus.STANDBY,
      lead: { id: 10, filialId: 1 },
    });

    await expect(reactivateOrcamento({ id: 500, user: regularUser }))
      .rejects.toMatchObject({ statusCode: 409 });
  });
});
