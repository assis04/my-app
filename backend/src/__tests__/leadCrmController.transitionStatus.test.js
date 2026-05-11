import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockTransitionStatus = vi.fn();
const mockSetTemperatura = vi.fn();
const mockReactivateLead = vi.fn();

vi.mock('../services/leadTransitionService.js', () => ({
  transitionStatus: mockTransitionStatus,
  setTemperatura: mockSetTemperatura,
  reactivateLead: mockReactivateLead,
}));

vi.mock('../services/leadCrmService.js', () => ({
  createLead: vi.fn(),
  listLeads: vi.fn(),
  getLeadById: vi.fn(),
  updateLead: vi.fn(),
  deleteLead: vi.fn(),
  transferLeads: vi.fn(),
  updateEtapaLote: vi.fn(),
}));

const { transitionStatus, setTemperatura, cancelLead, reactivateLead } = await import('../controllers/leadCrmController.js');
const { LeadEventType } = await import('../domain/leadEvents.js');
const { SideEffectType } = await import('../services/statusMachine.js');

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

function mockReq({ params = { id: '10' }, body = {}, user = { id: 7, role: 'Vendedor' } } = {}) {
  return { params, body, user };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('leadCrmController.transitionStatus — controller', () => {
  it('chama o serviço com os parâmetros corretos e retorna 200 com a resposta composta', async () => {
    const serviceResult = {
      lead: {
        id: 10,
        status: 'Agendado vídeo chamada',
        etapa: 'Negociação',
        kanbanCard: { id: 5, coluna: 'Negociação', posicao: 3 },
      },
      sideEffectsApplied: [SideEffectType.AGENDA_OPEN],
      history: [
        { id: 101, eventType: LeadEventType.STATUS_CHANGED, payload: { from: 'Em prospecção', to: 'Agendado vídeo chamada' } },
        { id: 102, eventType: LeadEventType.AGENDA_SCHEDULED, payload: { tipo: 'video_chamada', dataHora: '2026-05-01T14:00:00Z' } },
      ],
    };
    mockTransitionStatus.mockResolvedValue(serviceResult);

    const req = mockReq({
      params: { id: '10' },
      body: {
        status: 'Agendado vídeo chamada',
        contexto: { agendadoPara: '2026-05-01T14:00:00Z' },
      },
    });
    const res = mockRes();
    const next = vi.fn();

    await transitionStatus(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockTransitionStatus).toHaveBeenCalledWith({
      leadId: '10',
      newStatus: 'Agendado vídeo chamada',
      user: req.user,
      reason: null,
      context: { agendadoPara: '2026-05-01T14:00:00Z', dataHora: '2026-05-01T14:00:00Z' },
    });

    expect(res.json).toHaveBeenCalledTimes(1);
    const body = res.json.mock.calls[0][0];
    expect(body.lead).toEqual(serviceResult.lead);
    expect(body.kanbanCard).toEqual(serviceResult.lead.kanbanCard);
    expect(body.historyEvent).toEqual(serviceResult.history[0]); // status_changed
    // NON_OPEN_OR_CREATE removido — Orçamento é entidade separada agora (specs/crm-non.md).
    expect(body.outboxEvents).toEqual([
      { eventType: SideEffectType.AGENDA_OPEN, status: 'pending' },
    ]);
  });

  it('traduz motivo → reason para o serviço', async () => {
    mockTransitionStatus.mockResolvedValue({
      lead: { id: 10, kanbanCard: {} },
      sideEffectsApplied: [],
      history: [{ id: 1, eventType: LeadEventType.STATUS_CHANGED }],
    });

    await transitionStatus(
      mockReq({
        body: { status: 'Cancelado', motivo: 'cliente desistiu' },
      }),
      mockRes(),
      vi.fn(),
    );

    expect(mockTransitionStatus).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'cliente desistiu' }),
    );
  });

  it('reason padrão é null quando motivo ausente', async () => {
    mockTransitionStatus.mockResolvedValue({
      lead: { id: 10, kanbanCard: {} },
      sideEffectsApplied: [],
      history: [{ id: 1, eventType: LeadEventType.STATUS_CHANGED }],
    });

    await transitionStatus(
      mockReq({ body: { status: 'Em Atendimento Loja' } }),
      mockRes(),
      vi.fn(),
    );

    expect(mockTransitionStatus).toHaveBeenCalledWith(
      expect.objectContaining({ reason: null }),
    );
  });

  it('contexto.agendadoPara vira context.dataHora', async () => {
    mockTransitionStatus.mockResolvedValue({
      lead: { id: 10, kanbanCard: {} },
      sideEffectsApplied: [],
      history: [{ id: 1, eventType: LeadEventType.STATUS_CHANGED }],
    });

    await transitionStatus(
      mockReq({
        body: {
          status: 'Aguardando Planta/medidas',
          contexto: { agendadoPara: '2026-06-10T09:00:00Z' },
        },
      }),
      mockRes(),
      vi.fn(),
    );

    expect(mockTransitionStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({ dataHora: '2026-06-10T09:00:00Z' }),
      }),
    );
  });

  it('outboxEvents só inclui side-effects AGENDA_OPEN e NON_OPEN_OR_CREATE (não SET_CANCEL_FIELDS)', async () => {
    mockTransitionStatus.mockResolvedValue({
      lead: { id: 10, kanbanCard: {} },
      sideEffectsApplied: [SideEffectType.SET_CANCEL_FIELDS],
      history: [
        { id: 1, eventType: LeadEventType.STATUS_CHANGED },
        { id: 2, eventType: LeadEventType.LEAD_CANCELLED },
      ],
    });

    const res = mockRes();
    await transitionStatus(
      mockReq({
        body: { status: 'Cancelado', motivo: 'x' },
      }),
      res,
      vi.fn(),
    );

    const body = res.json.mock.calls[0][0];
    expect(body.outboxEvents).toEqual([]);
  });

  it('encaminha erro do serviço para next() — não vaza via json()', async () => {
    const err = new Error('Transição inválida');
    err.statusCode = 400;
    mockTransitionStatus.mockRejectedValue(err);

    const res = mockRes();
    const next = vi.fn();

    await transitionStatus(
      mockReq({ body: { status: 'Venda' } }),
      res,
      next,
    );

    expect(next).toHaveBeenCalledWith(err);
    expect(res.json).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('historyEvent é o evento status_changed (não o primeiro cronologicamente)', async () => {
    // edge: service pode retornar eventos em ordem arbitrária — controller deve
    // filtrar pelo tipo, não pelo índice
    mockTransitionStatus.mockResolvedValue({
      lead: { id: 10, kanbanCard: {} },
      sideEffectsApplied: [],
      history: [
        { id: 2, eventType: LeadEventType.LEAD_CANCELLED },
        { id: 1, eventType: LeadEventType.STATUS_CHANGED },
      ],
    });

    const res = mockRes();
    await transitionStatus(
      mockReq({ body: { status: 'Cancelado', motivo: 'x' } }),
      res,
      vi.fn(),
    );

    const body = res.json.mock.calls[0][0];
    expect(body.historyEvent.eventType).toBe(LeadEventType.STATUS_CHANGED);
    expect(body.historyEvent.id).toBe(1);
  });
});

describe('leadCrmController.setTemperatura — controller', () => {
  it('chama o serviço com params corretos e retorna 200 com o resultado', async () => {
    const serviceResult = {
      lead: { id: 10, temperatura: 'Muito interesse', kanbanCard: {} },
      historyEvent: { id: 50, eventType: 'temperatura_changed' },
      changed: true,
    };
    mockSetTemperatura.mockResolvedValue(serviceResult);

    const req = mockReq({
      params: { id: '10' },
      body: { temperatura: 'Muito interesse' },
    });
    const res = mockRes();
    const next = vi.fn();

    await setTemperatura(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockSetTemperatura).toHaveBeenCalledWith({
      leadId: '10',
      temperatura: 'Muito interesse',
      user: req.user,
    });
    expect(res.json).toHaveBeenCalledWith(serviceResult);
  });

  it('encaminha erro do serviço para next()', async () => {
    const err = new Error('403');
    err.statusCode = 403;
    mockSetTemperatura.mockRejectedValue(err);

    const res = mockRes();
    const next = vi.fn();
    await setTemperatura(
      mockReq({ body: { temperatura: 'Pouco interesse' } }),
      res,
      next,
    );

    expect(next).toHaveBeenCalledWith(err);
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe('leadCrmController.reactivateLead — controller', () => {
  it('modo="reativar" retorna 200 com shape de transição', async () => {
    const serviceResult = {
      modo: 'reativar',
      lead: {
        id: 10,
        status: 'Em prospecção',
        kanbanCard: { coluna: 'Prospecção', posicao: 5 },
      },
      sideEffectsApplied: [],
      history: [
        { id: 1, eventType: LeadEventType.STATUS_CHANGED },
        { id: 2, eventType: LeadEventType.LEAD_REACTIVATED },
      ],
    };
    mockReactivateLead.mockResolvedValue(serviceResult);

    const req = mockReq({
      params: { id: '10' },
      body: { modo: 'reativar', motivo: 'cliente voltou' },
    });
    const res = mockRes();
    const next = vi.fn();

    await reactivateLead(req, res, next);

    expect(mockReactivateLead).toHaveBeenCalledWith({
      leadId: '10',
      modo: 'reativar',
      motivo: 'cliente voltou',
      user: req.user,
    });
    expect(res.status).not.toHaveBeenCalled(); // default 200
    const body = res.json.mock.calls[0][0];
    expect(body.lead).toBeDefined();
    expect(body.kanbanCard).toBeDefined();
    expect(body.historyEvent.eventType).toBe(LeadEventType.STATUS_CHANGED);
  });

  it('modo="novo" retorna 201 com { leadAntigo, leadNovo }', async () => {
    const serviceResult = {
      modo: 'novo',
      leadAntigo: { id: 10, status: 'Cancelado' },
      leadNovo: { id: 11, status: 'Em prospecção', kanbanCard: {} },
    };
    mockReactivateLead.mockResolvedValue(serviceResult);

    const req = mockReq({
      params: { id: '10' },
      body: { modo: 'novo' },
    });
    const res = mockRes();
    const next = vi.fn();

    await reactivateLead(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      leadAntigo: serviceResult.leadAntigo,
      leadNovo: serviceResult.leadNovo,
    });
  });

  it('motivo padrão "" quando ausente', async () => {
    mockReactivateLead.mockResolvedValue({
      modo: 'reativar',
      lead: { id: 10, kanbanCard: {} },
      sideEffectsApplied: [],
      history: [{ id: 1, eventType: LeadEventType.STATUS_CHANGED }],
    });
    await reactivateLead(
      mockReq({ body: { modo: 'reativar' } }),
      mockRes(),
      vi.fn(),
    );
    expect(mockReactivateLead).toHaveBeenCalledWith(
      expect.objectContaining({ motivo: '' }),
    );
  });

  it('encaminha erro do serviço para next()', async () => {
    const err = new Error('forbidden');
    mockReactivateLead.mockRejectedValue(err);

    const res = mockRes();
    const next = vi.fn();
    await reactivateLead(
      mockReq({ body: { modo: 'reativar' } }),
      res,
      next,
    );

    expect(next).toHaveBeenCalledWith(err);
    expect(res.json).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('leadCrmController.cancelLead — controller', () => {
  it('delega para transitionStatus com newStatus=Cancelado + reason', async () => {
    const serviceResult = {
      lead: {
        id: 10,
        status: 'Cancelado',
        etapa: 'Cancelados',
        statusAntesCancelamento: 'Em prospecção',
        canceladoEm: new Date('2026-04-22T10:00:00Z'),
        kanbanCard: { id: 5, coluna: 'Cancelados', posicao: 1 },
      },
      sideEffectsApplied: [SideEffectType.SET_CANCEL_FIELDS],
      history: [
        { id: 100, eventType: LeadEventType.STATUS_CHANGED, payload: { from: 'Em prospecção', to: 'Cancelado' } },
        { id: 101, eventType: LeadEventType.LEAD_CANCELLED, payload: { reason: 'cliente sumiu' } },
      ],
    };
    mockTransitionStatus.mockResolvedValue(serviceResult);

    const req = mockReq({
      params: { id: '10' },
      body: { motivo: 'cliente sumiu' },
    });
    const res = mockRes();
    const next = vi.fn();

    await cancelLead(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockTransitionStatus).toHaveBeenCalledWith({
      leadId: '10',
      newStatus: 'Cancelado',
      user: req.user,
      reason: 'cliente sumiu',
    });
    // Não passa `context` porque cancelamento não depende de dataHora
    expect(mockTransitionStatus.mock.calls[0][0]).not.toHaveProperty('context');

    const body = res.json.mock.calls[0][0];
    expect(body.lead.status).toBe('Cancelado');
    expect(body.kanbanCard.coluna).toBe('Cancelados');
    expect(body.historyEvent.eventType).toBe(LeadEventType.STATUS_CHANGED);
    expect(body.outboxEvents).toEqual([]); // SET_CANCEL_FIELDS não é outbox
  });

  it('encaminha erro do serviço para next() (ex.: motivo vazio no service)', async () => {
    const err = new Error('Motivo é obrigatório ao cancelar um Lead.');
    err.statusCode = 400;
    mockTransitionStatus.mockRejectedValue(err);

    const res = mockRes();
    const next = vi.fn();

    await cancelLead(
      mockReq({ body: { motivo: 'x' } }),
      res,
      next,
    );

    expect(next).toHaveBeenCalledWith(err);
    expect(res.json).not.toHaveBeenCalled();
  });
});
