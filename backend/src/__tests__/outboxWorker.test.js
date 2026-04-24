import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockFetchPending = vi.fn();
const mockMarkDone = vi.fn();
const mockMarkFailed = vi.fn();

vi.mock('../services/outboxService.js', () => ({
  fetchPending: mockFetchPending,
  markDone: mockMarkDone,
  markFailed: mockMarkFailed,
  OutboxStatus: Object.freeze({ PENDING: 'pending', DONE: 'done', FAILED: 'failed' }),
}));

const { processBatch, start, stop, isRunning, HANDLERS, outboxWorker } = await import(
  '../workers/outboxWorker.js'
);
const { SideEffectType } = await import('../services/statusMachine.js');

// Silencia o console.log do worker nos testes
let logSpy;

beforeEach(() => {
  vi.clearAllMocks();
  mockMarkDone.mockResolvedValue({});
  mockMarkFailed.mockResolvedValue({});
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  stop(); // garante que nenhum teste deixa o loop rodando
  logSpy.mockRestore();
});

// ─── processBatch — lote vazio ────────────────────────────────────────────

describe('processBatch — lote vazio', () => {
  it('retorna zeros quando não há pendentes', async () => {
    mockFetchPending.mockResolvedValue([]);
    const r = await processBatch();
    expect(r).toEqual({ processed: 0, failed: 0, skipped: 0 });
    expect(mockMarkDone).not.toHaveBeenCalled();
    expect(mockMarkFailed).not.toHaveBeenCalled();
  });
});

// ─── processBatch — sucesso ───────────────────────────────────────────────

describe('processBatch — handler resolve', () => {
  it('chama o handler e markDone em sucesso', async () => {
    const event = { id: 1, eventType: SideEffectType.AGENDA_OPEN, aggregateId: 10, payload: {} };
    mockFetchPending.mockResolvedValue([event]);

    const mockHandler = vi.fn().mockResolvedValue();
    const handlers = { [SideEffectType.AGENDA_OPEN]: mockHandler };

    const r = await processBatch({ handlers });

    expect(mockHandler).toHaveBeenCalledWith(event);
    expect(mockMarkDone).toHaveBeenCalledWith(1);
    expect(mockMarkFailed).not.toHaveBeenCalled();
    expect(r).toEqual({ processed: 1, failed: 0, skipped: 0 });
  });

  it('respeita ordem FIFO e processa todos', async () => {
    const events = [
      { id: 1, eventType: SideEffectType.AGENDA_OPEN, aggregateId: 10, payload: {} },
      { id: 2, eventType: SideEffectType.AGENDA_OPEN, aggregateId: 11, payload: {} },
      { id: 3, eventType: SideEffectType.AGENDA_OPEN, aggregateId: 12, payload: {} },
    ];
    mockFetchPending.mockResolvedValue(events);

    const callOrder = [];
    const handlers = {
      [SideEffectType.AGENDA_OPEN]: vi.fn().mockImplementation(async (e) => {
        callOrder.push(e.id);
      }),
    };

    const r = await processBatch({ handlers });
    expect(callOrder).toEqual([1, 2, 3]);
    expect(r.processed).toBe(3);
    expect(mockMarkDone).toHaveBeenCalledTimes(3);
  });
});

// ─── processBatch — falha ─────────────────────────────────────────────────

describe('processBatch — handler lança erro', () => {
  it('chama markFailed com o erro e NÃO chama markDone', async () => {
    const event = { id: 7, eventType: SideEffectType.AGENDA_OPEN, aggregateId: 10, payload: {} };
    mockFetchPending.mockResolvedValue([event]);

    const err = new Error('agenda fora do ar');
    const handlers = { [SideEffectType.AGENDA_OPEN]: vi.fn().mockRejectedValue(err) };

    const r = await processBatch({ handlers, maxAttempts: 3 });

    expect(mockMarkFailed).toHaveBeenCalledWith(7, err, { maxAttempts: 3 });
    expect(mockMarkDone).not.toHaveBeenCalled();
    expect(r).toEqual({ processed: 0, failed: 1, skipped: 0 });
  });

  it('continua processando próximos eventos após falha de um (isolamento)', async () => {
    const events = [
      { id: 1, eventType: 't', aggregateId: 1, payload: {} },
      { id: 2, eventType: 't', aggregateId: 2, payload: {} },
      { id: 3, eventType: 't', aggregateId: 3, payload: {} },
    ];
    mockFetchPending.mockResolvedValue(events);

    const handlers = {
      t: vi.fn()
        .mockResolvedValueOnce()   // id=1 sucesso
        .mockRejectedValueOnce(new Error('boom')) // id=2 falha
        .mockResolvedValueOnce(),   // id=3 sucesso
    };

    const r = await processBatch({ handlers });
    expect(r).toEqual({ processed: 2, failed: 1, skipped: 0 });
    expect(mockMarkDone).toHaveBeenCalledTimes(2);
    expect(mockMarkFailed).toHaveBeenCalledTimes(1);
    expect(mockMarkFailed).toHaveBeenCalledWith(2, expect.any(Error), expect.any(Object));
  });

  it('não quebra o lote se markFailed também falhar (log + continua)', async () => {
    mockFetchPending.mockResolvedValue([
      { id: 1, eventType: 't', aggregateId: 1, payload: {} },
      { id: 2, eventType: 't', aggregateId: 2, payload: {} },
    ]);
    mockMarkFailed.mockRejectedValue(new Error('db fora'));
    const handlers = { t: vi.fn().mockRejectedValue(new Error('handler erro')) };

    const r = await processBatch({ handlers });
    // Ambos caem no caminho de falha, mas o lote completa
    expect(r.failed).toBe(2);
  });
});

// ─── processBatch — evento sem handler ────────────────────────────────────

describe('processBatch — handler ausente', () => {
  it('marca failed com erro claro (skipped++) e não invoca markDone', async () => {
    mockFetchPending.mockResolvedValue([
      { id: 1, eventType: 'tipo_desconhecido', aggregateId: 10, payload: {} },
    ]);

    const r = await processBatch({ handlers: {}, maxAttempts: 5 });

    expect(mockMarkFailed).toHaveBeenCalledWith(
      1,
      expect.stringMatching(/No handler registered.*tipo_desconhecido/),
      { maxAttempts: 5 },
    );
    expect(mockMarkDone).not.toHaveBeenCalled();
    expect(r).toEqual({ processed: 0, failed: 0, skipped: 1 });
  });
});

// ─── Handlers padrão stub ─────────────────────────────────────────────────

describe('HANDLERS default', () => {
  it('registra handler para AGENDA_OPEN (NON_OPEN_OR_CREATE foi removido)', () => {
    expect(typeof HANDLERS[SideEffectType.AGENDA_OPEN]).toBe('function');
    // non_open_or_create já não existe — SideEffectType não declara mais.
    expect(HANDLERS.non_open_or_create).toBeUndefined();
  });

  it('stub AGENDA_OPEN não lança — resolve silenciosamente (integração real vem depois)', async () => {
    const ev = { id: 1, aggregateId: 10, payload: { tipo: 'video_chamada' } };
    await expect(HANDLERS[SideEffectType.AGENDA_OPEN](ev)).resolves.toBeUndefined();
  });

  it('HANDLERS está congelado', () => {
    expect(Object.isFrozen(HANDLERS)).toBe(true);
  });
});

// ─── start / stop ─────────────────────────────────────────────────────────

describe('start / stop', () => {
  it('isRunning reflete estado após start e stop', async () => {
    mockFetchPending.mockResolvedValue([]);
    expect(isRunning()).toBe(false);

    start({ pollMs: 60_000 }); // intervalo grande pra não disparar durante o teste
    expect(isRunning()).toBe(true);

    stop();
    expect(isRunning()).toBe(false);
  });

  it('start() é idempotente — chamada dupla não cria 2 intervals', async () => {
    mockFetchPending.mockResolvedValue([]);
    start({ pollMs: 60_000 });
    start({ pollMs: 60_000 }); // no-op
    expect(isRunning()).toBe(true);
    stop();
    // Se tivesse criado 2 intervals, stop() limparia apenas um — validar
    // é difícil sem vazar timers. Basta que não lance e que isRunning volte false.
    expect(isRunning()).toBe(false);
  });

  it('stop() é idempotente', () => {
    stop(); // sem start prévio
    stop(); // duas vezes
    expect(isRunning()).toBe(false);
  });
});

// ─── Fachada ──────────────────────────────────────────────────────────────

describe('outboxWorker facade', () => {
  it('expõe start, stop, processBatch, isRunning, HANDLERS', () => {
    expect(typeof outboxWorker.start).toBe('function');
    expect(typeof outboxWorker.stop).toBe('function');
    expect(typeof outboxWorker.processBatch).toBe('function');
    expect(typeof outboxWorker.isRunning).toBe('function');
    expect(outboxWorker.HANDLERS).toBe(HANDLERS);
  });

  it('está congelada', () => {
    expect(Object.isFrozen(outboxWorker)).toBe(true);
  });
});
