import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetLeadById = vi.fn();
const mockListHistoryPaginated = vi.fn();

vi.mock('../services/leadCrmService.js', () => ({
  createLead: vi.fn(),
  listLeads: vi.fn(),
  getLeadById: mockGetLeadById,
  updateLead: vi.fn(),
  deleteLead: vi.fn(),
  transferLeads: vi.fn(),
  updateEtapaLote: vi.fn(),
}));

vi.mock('../services/leadTransitionService.js', () => ({
  transitionStatus: vi.fn(),
  setTemperatura: vi.fn(),
  reactivateLead: vi.fn(),
}));

vi.mock('../services/leadHistoryService.js', () => ({
  listByLeadPaginated: mockListHistoryPaginated,
}));

const { getLeadHistory } = await import('../controllers/leadCrmController.js');

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

function mockReq({ params = { id: '10' }, query = {}, user = { id: 7 } } = {}) {
  return { params, query, user };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('leadCrmController.getLeadHistory', () => {
  it('valida acesso via getLeadById antes de paginar o histórico', async () => {
    mockGetLeadById.mockResolvedValue({ id: 10 });
    mockListHistoryPaginated.mockResolvedValue({ items: [], nextCursor: null });

    await getLeadHistory(mockReq(), mockRes(), vi.fn());

    // ordem matters: getLeadById antes de listByLeadPaginated
    expect(mockGetLeadById.mock.invocationCallOrder[0])
      .toBeLessThan(mockListHistoryPaginated.mock.invocationCallOrder[0]);
  });

  it('passa cursor e limit do query para o serviço', async () => {
    mockGetLeadById.mockResolvedValue({ id: 10 });
    mockListHistoryPaginated.mockResolvedValue({ items: [], nextCursor: null });

    const req = mockReq({
      params: { id: '10' },
      query: { cursor: '42', limit: '100' },
    });
    await getLeadHistory(req, mockRes(), vi.fn());

    expect(mockListHistoryPaginated).toHaveBeenCalledWith('10', {
      cursor: '42',
      limit: '100',
    });
  });

  it('retorna items + nextCursor da paginação', async () => {
    mockGetLeadById.mockResolvedValue({ id: 10 });
    const payload = {
      items: [
        { id: 3, eventType: 'status_changed', payload: { from: 'A', to: 'B' } },
        { id: 2, eventType: 'temperatura_changed', payload: { from: null, to: 'Interessado' } },
      ],
      nextCursor: 2,
    };
    mockListHistoryPaginated.mockResolvedValue(payload);

    const res = mockRes();
    await getLeadHistory(mockReq(), res, vi.fn());

    expect(res.json).toHaveBeenCalledWith(payload);
  });

  it('encaminha 404 de getLeadById para next() sem consultar o histórico', async () => {
    const err = new Error('Lead não encontrado.');
    err.statusCode = 404;
    mockGetLeadById.mockRejectedValue(err);

    const res = mockRes();
    const next = vi.fn();
    await getLeadHistory(mockReq(), res, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(mockListHistoryPaginated).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('encaminha erro da paginação para next()', async () => {
    mockGetLeadById.mockResolvedValue({ id: 10 });
    const err = new Error('cursor inválido');
    mockListHistoryPaginated.mockRejectedValue(err);

    const res = mockRes();
    const next = vi.fn();
    await getLeadHistory(
      mockReq({ query: { cursor: 'abc' } }),
      res,
      next,
    );

    expect(next).toHaveBeenCalledWith(err);
    expect(res.json).not.toHaveBeenCalled();
  });
});
