import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Prisma ────────────────────────────────────────────────────────────
// $transaction(fn) executa fn com `tx` (o mesmo objeto do mockPrisma). Isso
// simula o comportamento real: se fn lançar, nada é persistido (os mocks ficam
// registrados mas o caller não processa o retorno). Se fn retornar, o valor
// volta como resultado de $transaction.

const mockPrisma = {
  $transaction: vi.fn(async (fn) => fn(mockPrisma)),
  $executeRaw: vi.fn(),
  lead: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  kanbanCard: {
    aggregate: vi.fn(),
    update: vi.fn(),
  },
  leadHistory: {
    create: vi.fn(),
  },
};

vi.mock('../config/prisma.js', () => ({ default: mockPrisma }));

const { transitionStatus } = await import('../services/leadTransitionService.js');
const { LeadStatus } = await import('../domain/leadStatus.js');
const { LeadEventType } = await import('../domain/leadEvents.js');
const { SideEffectType } = await import('../services/statusMachine.js');

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
  mockPrisma.$executeRaw.mockResolvedValue(1);
  // default: aggregate retorna 0 como maior posição (coluna vazia)
  mockPrisma.kanbanCard.aggregate.mockResolvedValue({ _max: { posicao: 0 } });
  mockPrisma.leadHistory.create.mockImplementation(({ data }) => ({ id: 1, ...data }));
  mockPrisma.kanbanCard.update.mockImplementation(({ data }) => ({ id: 1, ...data }));
});

// ─── Fixtures ──────────────────────────────────────────────────────────────

const leadBase = {
  id: 10,
  status: LeadStatus.EM_PROSPECCAO,
  etapa: 'Prospecção',
  filialId: 1,
  deletedAt: null,
  kanbanCard: { id: 5, leadId: 10, coluna: 'Prospecção', posicao: 3 },
};

const regularUser = {
  id: 7,
  role: 'Vendedor',
  filialId: 1,
  permissions: ['crm:leads:update'],
};

const admUser = {
  id: 99,
  role: 'ADM',
  filialId: null,
  permissions: ['*'],
};

function mockLeadLoad(lead) {
  mockPrisma.lead.findFirst.mockResolvedValue(lead);
  mockPrisma.lead.update.mockImplementation(({ data }) => ({ ...lead, ...data }));
}

// ─── Testes ────────────────────────────────────────────────────────────────

describe('transitionStatus — validações de entrada', () => {
  it('rejeita params nulo ou não-objeto', async () => {
    await expect(transitionStatus(null)).rejects.toThrow(/Parâmetros inválidos/);
    await expect(transitionStatus('x')).rejects.toThrow(/Parâmetros inválidos/);
  });

  it('rejeita leadId inválido', async () => {
    await expect(transitionStatus({ leadId: 'abc', newStatus: LeadStatus.VENDA, user: regularUser }))
      .rejects.toThrow(/leadId/);
    await expect(transitionStatus({ leadId: 0, newStatus: LeadStatus.VENDA, user: regularUser }))
      .rejects.toThrow(/leadId/);
  });

  it('rejeita quando user está ausente', async () => {
    await expect(transitionStatus({ leadId: 10, newStatus: LeadStatus.VENDA }))
      .rejects.toThrow(/Usuário autenticado/);
  });
});

describe('transitionStatus — lookup e isolamento', () => {
  it('retorna 404 quando Lead não existe', async () => {
    mockPrisma.lead.findFirst.mockResolvedValue(null);
    await expect(
      transitionStatus({ leadId: 99, newStatus: LeadStatus.VENDA, user: regularUser }),
    ).rejects.toThrow(/Lead não encontrado/);
  });

  it('bloqueia acesso cross-filial para não-ADM (403)', async () => {
    mockLeadLoad({ ...leadBase, filialId: 2 });
    await expect(
      transitionStatus({ leadId: 10, newStatus: LeadStatus.VENDA, user: regularUser }),
    ).rejects.toThrow(/outra filial/);
  });

  it('permite ADM acessar Lead de qualquer filial', async () => {
    mockLeadLoad({ ...leadBase, filialId: 2 });
    const r = await transitionStatus({
      leadId: 10, newStatus: LeadStatus.VENDA, user: admUser,
    });
    expect(r.lead.status).toBe(LeadStatus.VENDA);
  });

  it('adquire lock via SELECT FOR UPDATE antes de carregar o Lead', async () => {
    mockLeadLoad(leadBase);
    await transitionStatus({ leadId: 10, newStatus: LeadStatus.VENDA, user: regularUser });
    expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    // o lock deve rodar ANTES do findFirst
    const lockCall = mockPrisma.$executeRaw.mock.invocationCallOrder[0];
    const findCall = mockPrisma.lead.findFirst.mock.invocationCallOrder[0];
    expect(lockCall).toBeLessThan(findCall);
  });
});

describe('transitionStatus — guard de edição pós-venda', () => {
  it('bloqueia não-ADM ao tentar mudar status a partir de Venda (403)', async () => {
    mockLeadLoad({ ...leadBase, status: LeadStatus.VENDA });
    await expect(
      transitionStatus({
        leadId: 10,
        newStatus: LeadStatus.CANCELADO,
        user: regularUser,
        reason: 'err',
      }),
    ).rejects.toThrow(/crm:leads:edit-after-sale/);
  });

  it('permite ADM com permissão edit-after-sale alterar a partir de Venda', async () => {
    mockLeadLoad({ ...leadBase, status: LeadStatus.VENDA });
    const r = await transitionStatus({
      leadId: 10,
      newStatus: LeadStatus.CANCELADO,
      user: { ...admUser, permissions: ['*', 'crm:leads:edit-after-sale'] },
      reason: 'cliente desistiu',
    });
    expect(r.lead.status).toBe(LeadStatus.CANCELADO);
  });

  it('ADM sem permissão edit-after-sale é bloqueado (isAdm não dá bypass ao guard)', async () => {
    // NOTE: isAdm dá bypass ao isolamento de filial, mas NÃO ao guard pós-venda.
    // O guard pós-venda exige permissão explícita (spec §9.14).
    mockLeadLoad({ ...leadBase, status: LeadStatus.VENDA });
    await expect(
      transitionStatus({
        leadId: 10,
        newStatus: LeadStatus.POS_VENDA,
        user: { id: 1, role: 'ADM', filialId: null, permissions: [] }, // sem "*"
        reason: null,
      }),
    ).rejects.toThrow(/edit-after-sale/);
  });
});

describe('transitionStatus — validação da statusMachine', () => {
  it('rejeita transição inválida antes de qualquer write', async () => {
    mockLeadLoad({ ...leadBase, status: LeadStatus.CANCELADO });
    await expect(
      transitionStatus({
        leadId: 10,
        newStatus: LeadStatus.EM_PROSPECCAO,
        user: admUser,
      }),
    ).rejects.toThrow(/Transição inválida/);
    expect(mockPrisma.lead.update).not.toHaveBeenCalled();
    expect(mockPrisma.leadHistory.create).not.toHaveBeenCalled();
  });
});

describe('transitionStatus — happy path simples (intermediário → intermediário)', () => {
  beforeEach(() => {
    mockLeadLoad(leadBase);
  });

  it('atualiza status e etapa (derivada)', async () => {
    const r = await transitionStatus({
      leadId: 10,
      newStatus: LeadStatus.EM_ATENDIMENTO_LOJA,
      user: regularUser,
    });
    expect(r.lead.status).toBe(LeadStatus.EM_ATENDIMENTO_LOJA);
    expect(r.lead.etapa).toBe('Negociação');
    expect(mockPrisma.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 10 },
        data: expect.objectContaining({
          status: LeadStatus.EM_ATENDIMENTO_LOJA,
          etapa: 'Negociação',
        }),
      }),
    );
  });

  it('move KanbanCard para nova coluna com posicao incrementada', async () => {
    mockPrisma.kanbanCard.aggregate.mockResolvedValue({ _max: { posicao: 12 } });
    await transitionStatus({
      leadId: 10,
      newStatus: LeadStatus.AGENDADO_VISITA,
      user: regularUser,
    });
    expect(mockPrisma.kanbanCard.update).toHaveBeenCalledWith({
      where: { leadId: 10 },
      data: { coluna: 'Negociação', posicao: 13 },
    });
  });

  it('registra evento status_changed no histórico com autor', async () => {
    await transitionStatus({
      leadId: 10,
      newStatus: LeadStatus.EM_ATENDIMENTO_LOJA,
      user: regularUser,
    });
    const historyCalls = mockPrisma.leadHistory.create.mock.calls;
    expect(historyCalls.length).toBeGreaterThanOrEqual(1);
    expect(historyCalls[0][0].data).toMatchObject({
      leadId: 10,
      authorUserId: 7,
      eventType: LeadEventType.STATUS_CHANGED,
      payload: { from: LeadStatus.EM_PROSPECCAO, to: LeadStatus.EM_ATENDIMENTO_LOJA },
    });
  });

  it('NÃO preenche statusAntesCancelamento/canceladoEm em transição comum', async () => {
    await transitionStatus({
      leadId: 10,
      newStatus: LeadStatus.AGUARDANDO_PLANTA,
      user: regularUser,
    });
    const updateCall = mockPrisma.lead.update.mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty('statusAntesCancelamento');
    expect(updateCall.data).not.toHaveProperty('canceladoEm');
  });
});

describe('transitionStatus — side-effect AGENDA_OPEN', () => {
  beforeEach(() => {
    mockLeadLoad(leadBase);
  });

  it('Aguardando Planta/medidas: escreve agenda_scheduled com tipo correto', async () => {
    await transitionStatus({
      leadId: 10,
      newStatus: LeadStatus.AGUARDANDO_PLANTA,
      user: regularUser,
      context: { dataHora: '2026-05-01T10:00:00Z' },
    });
    const calls = mockPrisma.leadHistory.create.mock.calls.map((c) => c[0].data);
    const agendaEvent = calls.find((d) => d.eventType === LeadEventType.AGENDA_SCHEDULED);
    expect(agendaEvent).toBeDefined();
    expect(agendaEvent.payload).toEqual({
      tipo: 'coleta_planta_medidas',
      dataHora: '2026-05-01T10:00:00Z',
    });
  });

  it('Agendado vídeo chamada: escreve agenda_scheduled com tipo video_chamada', async () => {
    await transitionStatus({
      leadId: 10,
      newStatus: LeadStatus.AGENDADO_VIDEO,
      user: regularUser,
    });
    const calls = mockPrisma.leadHistory.create.mock.calls.map((c) => c[0].data);
    const agendaEvent = calls.find((d) => d.eventType === LeadEventType.AGENDA_SCHEDULED);
    expect(agendaEvent.payload.tipo).toBe('video_chamada');
  });

  it('Agendado visita na loja: NÃO escreve non_generated (N.O.N. só é confirmada via outbox)', async () => {
    await transitionStatus({
      leadId: 10,
      newStatus: LeadStatus.AGENDADO_VISITA,
      user: regularUser,
    });
    const calls = mockPrisma.leadHistory.create.mock.calls.map((c) => c[0].data);
    expect(calls.find((d) => d.eventType === LeadEventType.NON_GENERATED)).toBeUndefined();
  });

  it('sideEffectsApplied inclui AGENDA_OPEN e NON_OPEN_OR_CREATE', async () => {
    const r = await transitionStatus({
      leadId: 10,
      newStatus: LeadStatus.AGENDADO_VISITA,
      user: regularUser,
    });
    expect(r.sideEffectsApplied).toContain(SideEffectType.AGENDA_OPEN);
    expect(r.sideEffectsApplied).toContain(SideEffectType.NON_OPEN_OR_CREATE);
  });
});

describe('transitionStatus — Cancelamento', () => {
  it('exige motivo ao cancelar', async () => {
    mockLeadLoad(leadBase);
    await expect(
      transitionStatus({ leadId: 10, newStatus: LeadStatus.CANCELADO, user: regularUser }),
    ).rejects.toThrow(/Motivo é obrigatório/);

    await expect(
      transitionStatus({
        leadId: 10, newStatus: LeadStatus.CANCELADO, user: regularUser, reason: '   ',
      }),
    ).rejects.toThrow(/Motivo é obrigatório/);
  });

  it('preenche statusAntesCancelamento com o status atual e canceladoEm com Date', async () => {
    mockLeadLoad({ ...leadBase, status: LeadStatus.AGENDADO_VIDEO });

    await transitionStatus({
      leadId: 10,
      newStatus: LeadStatus.CANCELADO,
      user: regularUser,
      reason: 'cliente sumiu',
    });

    const updateCall = mockPrisma.lead.update.mock.calls[0][0];
    expect(updateCall.data.statusAntesCancelamento).toBe(LeadStatus.AGENDADO_VIDEO);
    expect(updateCall.data.canceladoEm).toBeInstanceOf(Date);
    expect(updateCall.data.status).toBe(LeadStatus.CANCELADO);
    expect(updateCall.data.etapa).toBe('Cancelados');
  });

  it('move KanbanCard para coluna Cancelados', async () => {
    mockLeadLoad(leadBase);
    await transitionStatus({
      leadId: 10, newStatus: LeadStatus.CANCELADO, user: regularUser, reason: 'x',
    });
    expect(mockPrisma.kanbanCard.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ coluna: 'Cancelados' }) }),
    );
  });

  it('escreve lead_cancelled no histórico com motivo', async () => {
    mockLeadLoad(leadBase);
    await transitionStatus({
      leadId: 10, newStatus: LeadStatus.CANCELADO, user: regularUser, reason: 'cliente desistiu',
    });
    const calls = mockPrisma.leadHistory.create.mock.calls.map((c) => c[0].data);
    const cancelEvent = calls.find((d) => d.eventType === LeadEventType.LEAD_CANCELLED);
    expect(cancelEvent).toBeDefined();
    expect(cancelEvent.payload).toEqual({ reason: 'cliente desistiu' });
  });

  it('escreve AMBOS status_changed E lead_cancelled (dois eventos no mesmo commit)', async () => {
    mockLeadLoad(leadBase);
    await transitionStatus({
      leadId: 10, newStatus: LeadStatus.CANCELADO, user: regularUser, reason: 'x',
    });
    const types = mockPrisma.leadHistory.create.mock.calls.map((c) => c[0].data.eventType);
    expect(types).toContain(LeadEventType.STATUS_CHANGED);
    expect(types).toContain(LeadEventType.LEAD_CANCELLED);
  });
});

describe('transitionStatus — Venda → Pós-venda (caminho terminal feliz)', () => {
  it('Venda → Pós-venda com ADM+edit-after-sale permission', async () => {
    mockLeadLoad({ ...leadBase, status: LeadStatus.VENDA });
    const r = await transitionStatus({
      leadId: 10,
      newStatus: LeadStatus.POS_VENDA,
      user: { ...admUser, permissions: ['*', 'crm:leads:edit-after-sale'] },
    });
    expect(r.lead.status).toBe(LeadStatus.POS_VENDA);
    expect(r.lead.etapa).toBe('Pós-venda');
  });
});

describe('transitionStatus — contrato retornado', () => {
  it('retorna { lead, sideEffectsApplied, history }', async () => {
    mockLeadLoad(leadBase);
    const r = await transitionStatus({
      leadId: 10, newStatus: LeadStatus.AGUARDANDO_PLANTA, user: regularUser,
    });
    expect(r).toHaveProperty('lead');
    expect(r).toHaveProperty('sideEffectsApplied');
    expect(r).toHaveProperty('history');
    expect(Array.isArray(r.sideEffectsApplied)).toBe(true);
    expect(Array.isArray(r.history)).toBe(true);
    expect(r.history.length).toBeGreaterThan(0);
  });

  it('lead retornado inclui kanbanCard atualizado', async () => {
    mockLeadLoad(leadBase);
    const r = await transitionStatus({
      leadId: 10, newStatus: LeadStatus.AGUARDANDO_PLANTA, user: regularUser,
    });
    expect(r.lead.kanbanCard).toBeDefined();
  });
});
