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
    create: vi.fn(),
  },
  kanbanCard: {
    aggregate: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  leadHistory: {
    create: vi.fn(),
  },
  outbox: {
    create: vi.fn(),
  },
};

vi.mock('../config/prisma.js', () => ({ default: mockPrisma }));

const { transitionStatus, setTemperatura, reactivateLead } = await import('../services/leadTransitionService.js');
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
  mockPrisma.kanbanCard.create.mockImplementation(({ data }) => ({ id: 10, ...data }));
  mockPrisma.lead.create.mockImplementation(({ data }) => ({ id: 999, ...data }));
  mockPrisma.outbox.create.mockImplementation(({ data }) => ({ id: 77, ...data }));
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

const reactivatorUser = {
  id: 55,
  role: 'Gerente',
  filialId: 1,
  permissions: ['crm:leads:update', 'crm:leads:reactivate'],
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

  // Regressão 2026-04-24: wildcard '*' deve satisfazer hasPermission interno
  // (mesmo comportamento da route middleware authorizePermission).
  it('aceita user com wildcard "*" mesmo sem edit-after-sale explícita', async () => {
    mockLeadLoad({ ...leadBase, status: LeadStatus.VENDA });
    const r = await transitionStatus({
      leadId: 10,
      newStatus: LeadStatus.POS_VENDA,
      user: { id: 1, role: 'ADM', filialId: null, permissions: ['*'] },
      reason: null,
    });
    expect(r.lead.status).toBe(LeadStatus.POS_VENDA);
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

  it('sideEffectsApplied inclui AGENDA_OPEN (apenas) em Agendado visita', async () => {
    const r = await transitionStatus({
      leadId: 10,
      newStatus: LeadStatus.AGENDADO_VISITA,
      user: regularUser,
    });
    expect(r.sideEffectsApplied).toContain(SideEffectType.AGENDA_OPEN);
    // NON_OPEN_OR_CREATE removido — Orçamento agora é criado explicitamente
    // pelo vendedor via POST /api/crm/orcamentos (specs/crm-non.md).
    expect(r.sideEffectsApplied).not.toContain('non_open_or_create');
  });

  it('enfileira AGENDA_OPEN na outbox quando transição pede agenda', async () => {
    await transitionStatus({
      leadId: 10,
      newStatus: LeadStatus.AGUARDANDO_PLANTA,
      user: regularUser,
      context: { dataHora: '2026-05-01T10:00:00Z' },
    });
    const outboxCalls = mockPrisma.outbox.create.mock.calls.map((c) => c[0].data);
    const agendaIntent = outboxCalls.find((d) => d.eventType === SideEffectType.AGENDA_OPEN);
    expect(agendaIntent).toBeDefined();
    expect(agendaIntent).toMatchObject({
      aggregate: 'lead',
      aggregateId: 10,
      status: 'pending',
      attempts: 0,
    });
    expect(agendaIntent.payload).toMatchObject({
      tipo: 'coleta_planta_medidas',
      dataHora: '2026-05-01T10:00:00Z',
      triggeredBy: 7,
    });
  });

  it('Agendado visita: NÃO enfileira mais NON_OPEN_OR_CREATE (Orçamento é entidade separada)', async () => {
    await transitionStatus({
      leadId: 10,
      newStatus: LeadStatus.AGENDADO_VISITA,
      user: regularUser,
    });
    const types = mockPrisma.outbox.create.mock.calls.map((c) => c[0].data.eventType);
    expect(types).toContain(SideEffectType.AGENDA_OPEN);
    expect(types).not.toContain('non_open_or_create');
  });

  it('Agendado vídeo chamada: enfileira APENAS AGENDA_OPEN (sem criação automática de Orçamento)', async () => {
    await transitionStatus({
      leadId: 10,
      newStatus: LeadStatus.AGENDADO_VIDEO,
      user: regularUser,
    });
    const types = mockPrisma.outbox.create.mock.calls.map((c) => c[0].data.eventType);
    expect(types).toContain(SideEffectType.AGENDA_OPEN);
    expect(types).not.toContain('non_open_or_create');
  });

  it('transição SEM side-effect externo NÃO toca a outbox', async () => {
    await transitionStatus({
      leadId: 10,
      newStatus: LeadStatus.EM_ATENDIMENTO_LOJA,
      user: regularUser,
    });
    expect(mockPrisma.outbox.create).not.toHaveBeenCalled();
  });

  it('cancelamento NÃO enfileira outbox (SET_CANCEL_FIELDS é interno)', async () => {
    mockLeadLoad(leadBase);
    await transitionStatus({
      leadId: 10,
      newStatus: LeadStatus.CANCELADO,
      user: regularUser,
      reason: 'teste',
    });
    expect(mockPrisma.outbox.create).not.toHaveBeenCalled();
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

// ─── setTemperatura ──────────────────────────────────────────────────────

describe('setTemperatura — validações de entrada', () => {
  it('rejeita params nulo', async () => {
    await expect(setTemperatura(null)).rejects.toThrow(/Parâmetros inválidos/);
  });

  it('rejeita leadId inválido', async () => {
    await expect(
      setTemperatura({ leadId: 0, temperatura: 'Pouco interesse', user: regularUser }),
    ).rejects.toThrow(/leadId/);
    await expect(
      setTemperatura({ leadId: 'abc', temperatura: 'Pouco interesse', user: regularUser }),
    ).rejects.toThrow(/leadId/);
  });

  it('rejeita quando user está ausente', async () => {
    await expect(
      setTemperatura({ leadId: 10, temperatura: 'Pouco interesse' }),
    ).rejects.toThrow(/Usuário autenticado/);
  });

  it('rejeita temperatura fora do enum', async () => {
    await expect(
      setTemperatura({ leadId: 10, temperatura: 'Quente', user: regularUser }),
    ).rejects.toThrow(/Temperatura inválida/);
    await expect(
      setTemperatura({ leadId: 10, temperatura: null, user: regularUser }),
    ).rejects.toThrow(/Temperatura inválida/);
  });
});

describe('setTemperatura — lookup e isolamento', () => {
  it('retorna 404 quando Lead não existe', async () => {
    mockPrisma.lead.findFirst.mockResolvedValue(null);
    await expect(
      setTemperatura({ leadId: 99, temperatura: 'Pouco interesse', user: regularUser }),
    ).rejects.toThrow(/Lead não encontrado/);
  });

  it('bloqueia acesso cross-filial para não-ADM (403)', async () => {
    mockLeadLoad({ ...leadBase, filialId: 2 });
    await expect(
      setTemperatura({ leadId: 10, temperatura: 'Pouco interesse', user: regularUser }),
    ).rejects.toThrow(/outra filial/);
  });

  it('adquire FOR UPDATE lock antes do findFirst', async () => {
    mockLeadLoad(leadBase);
    await setTemperatura({ leadId: 10, temperatura: 'Pouco interesse', user: regularUser });
    const lockCall = mockPrisma.$executeRaw.mock.invocationCallOrder[0];
    const findCall = mockPrisma.lead.findFirst.mock.invocationCallOrder[0];
    expect(lockCall).toBeLessThan(findCall);
  });
});

describe('setTemperatura — guard pós-venda', () => {
  it('bloqueia não-ADM ao tentar alterar temperatura em Lead Venda (403)', async () => {
    mockLeadLoad({ ...leadBase, status: LeadStatus.VENDA });
    await expect(
      setTemperatura({ leadId: 10, temperatura: 'Pouco interesse', user: regularUser }),
    ).rejects.toThrow(/edit-after-sale/);
  });

  it('permite ADM com edit-after-sale alterar em Lead Venda', async () => {
    mockLeadLoad({ ...leadBase, status: LeadStatus.VENDA });
    const r = await setTemperatura({
      leadId: 10,
      temperatura: 'Pouco interesse',
      user: { ...admUser, permissions: ['*', 'crm:leads:edit-after-sale'] },
    });
    expect(r.changed).toBe(true);
  });
});

describe('setTemperatura — happy path', () => {
  it('atualiza temperatura e registra evento temperatura_changed', async () => {
    mockLeadLoad({ ...leadBase, temperatura: null });

    const r = await setTemperatura({
      leadId: 10,
      temperatura: 'Muito interesse',
      user: regularUser,
    });

    expect(r.changed).toBe(true);
    expect(r.lead.temperatura).toBe('Muito interesse');
    expect(mockPrisma.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 10 },
        data: { temperatura: 'Muito interesse' },
      }),
    );
    const historyCall = mockPrisma.leadHistory.create.mock.calls[0][0].data;
    expect(historyCall).toMatchObject({
      leadId: 10,
      authorUserId: 7,
      eventType: LeadEventType.TEMPERATURA_CHANGED,
      payload: { from: null, to: 'Muito interesse' },
    });
  });

  it('registra from/to corretamente quando já havia uma temperatura anterior', async () => {
    mockLeadLoad({ ...leadBase, temperatura: 'Pouco interesse' });
    await setTemperatura({
      leadId: 10,
      temperatura: 'Sem interesse',
      user: regularUser,
    });
    const historyCall = mockPrisma.leadHistory.create.mock.calls[0][0].data;
    expect(historyCall.payload).toEqual({ from: 'Pouco interesse', to: 'Sem interesse' });
  });

  it('é no-op quando temperatura nova é igual à atual (changed=false, sem history)', async () => {
    mockLeadLoad({ ...leadBase, temperatura: 'Pouco interesse' });
    const r = await setTemperatura({
      leadId: 10,
      temperatura: 'Pouco interesse',
      user: regularUser,
    });
    expect(r.changed).toBe(false);
    expect(r.historyEvent).toBeNull();
    expect(mockPrisma.lead.update).not.toHaveBeenCalled();
    expect(mockPrisma.leadHistory.create).not.toHaveBeenCalled();
  });

  it('retorna { lead, historyEvent, changed }', async () => {
    mockLeadLoad({ ...leadBase, temperatura: null });
    const r = await setTemperatura({
      leadId: 10,
      temperatura: 'Pouco interesse',
      user: regularUser,
    });
    expect(r).toHaveProperty('lead');
    expect(r).toHaveProperty('historyEvent');
    expect(r).toHaveProperty('changed');
  });
});

// ─── reactivateLead ──────────────────────────────────────────────────────

describe('reactivateLead — validações de entrada', () => {
  it('rejeita params nulo', async () => {
    await expect(reactivateLead(null)).rejects.toThrow(/Parâmetros inválidos/);
  });

  it('rejeita leadId inválido', async () => {
    await expect(
      reactivateLead({ leadId: 0, modo: 'reativar', user: reactivatorUser }),
    ).rejects.toThrow(/leadId/);
  });

  it('rejeita user ausente', async () => {
    await expect(
      reactivateLead({ leadId: 10, modo: 'reativar' }),
    ).rejects.toThrow(/Usuário autenticado/);
  });

  it('rejeita modo fora do enum', async () => {
    await expect(
      reactivateLead({ leadId: 10, modo: 'ressuscitar', user: reactivatorUser }),
    ).rejects.toThrow(/modo/);
  });

  it('rejeita user sem permissão crm:leads:reactivate (403)', async () => {
    await expect(
      reactivateLead({ leadId: 10, modo: 'reativar', user: regularUser }),
    ).rejects.toThrow(/crm:leads:reactivate/);
  });

  // Regressão 2026-04-24: ADM com permissions:["*"] estava sendo bloqueado pelo
  // hasPermission interno (literal includes('crm:leads:reactivate')). O fix
  // expande '*' como wildcard, mantendo o requisito de permissão explícita
  // pra users sem '*' (preservando spec §9.14).
  it('aceita user com wildcard "*" mesmo sem listar crm:leads:reactivate explicitamente', async () => {
    mockLeadLoad({
      ...leadBase,
      status: LeadStatus.CANCELADO,
      statusAntesCancelamento: LeadStatus.EM_PROSPECCAO,
    });
    const r = await reactivateLead({
      leadId: 10,
      modo: 'reativar',
      user: { id: 1, role: 'ADM', filialId: null, permissions: ['*'] },
    });
    expect(r.lead.status).toBe(LeadStatus.EM_PROSPECCAO);
  });
});

describe('reactivateLead — guards', () => {
  it('retorna 404 se Lead não existe', async () => {
    mockPrisma.lead.findFirst.mockResolvedValue(null);
    await expect(
      reactivateLead({ leadId: 99, modo: 'reativar', user: reactivatorUser }),
    ).rejects.toThrow(/Lead não encontrado/);
  });

  it('bloqueia cross-filial (403) mesmo com permissão reactivate', async () => {
    mockLeadLoad({ ...leadBase, status: LeadStatus.CANCELADO, filialId: 2 });
    await expect(
      reactivateLead({ leadId: 10, modo: 'reativar', user: reactivatorUser }),
    ).rejects.toThrow(/outra filial/);
  });

  it('rejeita reativação de Lead que NÃO está Cancelado', async () => {
    mockLeadLoad({ ...leadBase, status: LeadStatus.EM_PROSPECCAO });
    await expect(
      reactivateLead({ leadId: 10, modo: 'reativar', user: reactivatorUser }),
    ).rejects.toThrow(/Cancelado/);
  });

  it('adquire FOR UPDATE antes do findFirst', async () => {
    mockLeadLoad({ ...leadBase, status: LeadStatus.CANCELADO });
    await reactivateLead({ leadId: 10, modo: 'reativar', user: reactivatorUser });
    expect(mockPrisma.$executeRaw.mock.invocationCallOrder[0])
      .toBeLessThan(mockPrisma.lead.findFirst.mock.invocationCallOrder[0]);
  });
});

describe('reactivateLead — modo "reativar"', () => {
  it('restaura para statusAntesCancelamento quando existe', async () => {
    mockLeadLoad({
      ...leadBase,
      status: LeadStatus.CANCELADO,
      statusAntesCancelamento: LeadStatus.AGENDADO_VIDEO,
      canceladoEm: new Date('2026-04-01'),
    });

    const r = await reactivateLead({
      leadId: 10, modo: 'reativar', user: reactivatorUser,
    });

    expect(r.modo).toBe('reativar');
    const updateData = mockPrisma.lead.update.mock.calls[0][0].data;
    expect(updateData.status).toBe(LeadStatus.AGENDADO_VIDEO);
    expect(updateData.etapa).toBe('Negociação');
    expect(updateData.reativadoEm).toBeInstanceOf(Date);
    // canceladoEm é preservado — não aparece em data
    expect(updateData).not.toHaveProperty('canceladoEm');
  });

  it('faz fallback para "Em prospecção" quando statusAntesCancelamento é null', async () => {
    mockLeadLoad({
      ...leadBase,
      status: LeadStatus.CANCELADO,
      statusAntesCancelamento: null,
    });

    await reactivateLead({ leadId: 10, modo: 'reativar', user: reactivatorUser });

    const updateData = mockPrisma.lead.update.mock.calls[0][0].data;
    expect(updateData.status).toBe(LeadStatus.EM_PROSPECCAO);
    expect(updateData.etapa).toBe('Prospecção');
  });

  it('faz fallback quando statusAntesCancelamento é valor inválido (defensivo)', async () => {
    mockLeadLoad({
      ...leadBase,
      status: LeadStatus.CANCELADO,
      statusAntesCancelamento: 'Ativo', // legado
    });

    await reactivateLead({ leadId: 10, modo: 'reativar', user: reactivatorUser });

    expect(mockPrisma.lead.update.mock.calls[0][0].data.status).toBe(LeadStatus.EM_PROSPECCAO);
  });

  it('move KanbanCard para a coluna do status restaurado', async () => {
    mockPrisma.kanbanCard.aggregate.mockResolvedValue({ _max: { posicao: 7 } });
    mockLeadLoad({
      ...leadBase,
      status: LeadStatus.CANCELADO,
      statusAntesCancelamento: LeadStatus.EM_ATENDIMENTO_LOJA,
    });

    await reactivateLead({ leadId: 10, modo: 'reativar', user: reactivatorUser });

    expect(mockPrisma.kanbanCard.update).toHaveBeenCalledWith({
      where: { leadId: 10 },
      data: { coluna: 'Negociação', posicao: 8 },
    });
  });

  it('registra 2 eventos: status_changed + lead_reactivated', async () => {
    mockLeadLoad({
      ...leadBase,
      status: LeadStatus.CANCELADO,
      statusAntesCancelamento: LeadStatus.EM_PROSPECCAO,
    });

    await reactivateLead({
      leadId: 10, modo: 'reativar', user: reactivatorUser, motivo: 'cliente voltou',
    });

    const events = mockPrisma.leadHistory.create.mock.calls.map((c) => c[0].data);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      eventType: LeadEventType.STATUS_CHANGED,
      payload: { from: LeadStatus.CANCELADO, to: LeadStatus.EM_PROSPECCAO },
    });
    expect(events[1]).toMatchObject({
      eventType: LeadEventType.LEAD_REACTIVATED,
      payload: { motivo: 'cliente voltou' },
    });
  });

  it('lead_reactivated.payload é {} (vazio) quando motivo não é passado', async () => {
    mockLeadLoad({
      ...leadBase,
      status: LeadStatus.CANCELADO,
    });
    await reactivateLead({ leadId: 10, modo: 'reativar', user: reactivatorUser });
    const reactivatedEvent = mockPrisma.leadHistory.create.mock.calls
      .map((c) => c[0].data)
      .find((e) => e.eventType === LeadEventType.LEAD_REACTIVATED);
    expect(reactivatedEvent.payload).toEqual({});
  });

  it('retorna shape compatível com formatTransitionResponse', async () => {
    mockLeadLoad({ ...leadBase, status: LeadStatus.CANCELADO });
    const r = await reactivateLead({ leadId: 10, modo: 'reativar', user: reactivatorUser });
    expect(r).toHaveProperty('modo', 'reativar');
    expect(r).toHaveProperty('lead');
    expect(r).toHaveProperty('sideEffectsApplied');
    expect(r).toHaveProperty('history');
    expect(r.sideEffectsApplied).toEqual([]);
    expect(r.lead.kanbanCard).toBeDefined();
  });
});

describe('reactivateLead — modo "novo"', () => {
  const cancelledLead = {
    ...leadBase,
    id: 10,
    status: LeadStatus.CANCELADO,
    nome: 'João',
    sobrenome: 'Silva',
    celular: '11999999999',
    email: 'joao@test.com',
    cpfCnpj: '12345678900',
    cep: '01000000',
    endereco: 'Rua X, 100',
    tipoImovel: 'Apartamento',
    statusImovel: 'Pronto',
    canal: 'indicacao',
    origem: 'amigo',
    contaId: 50,
    filialId: 1,
    preVendedorId: 7,
    vendedorId: null,
    gerenteId: 3,
    conjugeNome: 'Maria',
    conjugeEmail: 'maria@test.com',
    canceladoEm: new Date('2026-04-01'),
    statusAntesCancelamento: LeadStatus.EM_ATENDIMENTO_LOJA,
    temperatura: 'Muito interesse',
  };

  it('cria novo Lead com identidade copiada e pipeline zerado', async () => {
    mockLeadLoad(cancelledLead);

    await reactivateLead({ leadId: 10, modo: 'novo', user: reactivatorUser });

    const createData = mockPrisma.lead.create.mock.calls[0][0].data;
    // Identidade copiada
    expect(createData.nome).toBe('João');
    expect(createData.celular).toBe('11999999999');
    expect(createData.cpfCnpj).toBe('12345678900');
    expect(createData.endereco).toBe('Rua X, 100');
    // Relações preservadas
    expect(createData.contaId).toBe(50);
    expect(createData.filialId).toBe(1);
    expect(createData.preVendedorId).toBe(7);
    // Cônjuge preservado
    expect(createData.conjugeNome).toBe('Maria');
    // Pipeline zerado
    expect(createData.status).toBe(LeadStatus.EM_PROSPECCAO);
    expect(createData.etapa).toBe('Prospecção');
    expect(createData.temperatura).toBeNull();
    expect(createData.fonte).toBe('crm');
  });

  it('NÃO altera o Lead antigo (permanece Cancelado)', async () => {
    mockLeadLoad(cancelledLead);
    await reactivateLead({ leadId: 10, modo: 'novo', user: reactivatorUser });
    expect(mockPrisma.lead.update).not.toHaveBeenCalled();
  });

  it('cria KanbanCard novo na coluna Prospecção', async () => {
    mockLeadLoad(cancelledLead);
    mockPrisma.kanbanCard.aggregate.mockResolvedValue({ _max: { posicao: 4 } });

    await reactivateLead({ leadId: 10, modo: 'novo', user: reactivatorUser });

    expect(mockPrisma.kanbanCard.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        leadId: 999, // id do novo lead (mock default)
        coluna: 'Prospecção',
        posicao: 5,
      }),
    });
  });

  it('registra reactivated_as_new_lead no Lead antigo com ponteiro pro novo', async () => {
    mockLeadLoad(cancelledLead);
    await reactivateLead({ leadId: 10, modo: 'novo', user: reactivatorUser, motivo: 'retornou após 6 meses' });

    const events = mockPrisma.leadHistory.create.mock.calls.map((c) => c[0].data);
    const oldLeadEvent = events.find((e) => e.eventType === LeadEventType.REACTIVATED_AS_NEW_LEAD);
    expect(oldLeadEvent).toBeDefined();
    expect(oldLeadEvent.leadId).toBe(10); // Lead antigo
    expect(oldLeadEvent.payload.newLeadId).toBe(999);
    expect(oldLeadEvent.payload.motivo).toBe('retornou após 6 meses');
  });

  it('registra created_from_reactivation no Lead novo com ponteiro pro antigo', async () => {
    mockLeadLoad(cancelledLead);
    await reactivateLead({ leadId: 10, modo: 'novo', user: reactivatorUser });

    const events = mockPrisma.leadHistory.create.mock.calls.map((c) => c[0].data);
    const newLeadEvent = events.find((e) => e.eventType === LeadEventType.CREATED_FROM_REACTIVATION);
    expect(newLeadEvent).toBeDefined();
    expect(newLeadEvent.leadId).toBe(999); // Lead novo
    expect(newLeadEvent.payload.sourceLeadId).toBe(10);
  });

  it('retorna { modo, leadAntigo, leadNovo } (sem shape de transição)', async () => {
    mockLeadLoad(cancelledLead);
    const r = await reactivateLead({ leadId: 10, modo: 'novo', user: reactivatorUser });
    expect(r.modo).toBe('novo');
    expect(r.leadAntigo).toBeDefined();
    expect(r.leadAntigo.id).toBe(10);
    expect(r.leadNovo).toBeDefined();
    expect(r.leadNovo.id).toBe(999);
    expect(r.leadNovo.kanbanCard).toBeDefined();
    expect(r).not.toHaveProperty('history');
    expect(r).not.toHaveProperty('sideEffectsApplied');
  });
});
