/**
 * outboxWorker — consumidor da fila outbox.
 *
 * Fonte de verdade: specs/crm-plan.md §2.6 / Task #16
 *
 * Responsabilidade:
 *   1. Buscar eventos pendentes (FIFO via outboxService.fetchPending)
 *   2. Para cada evento, achar o handler registrado por eventType
 *   3. Invocar o handler; no sucesso, markDone; no erro, markFailed
 *      (que cuida do retry + transição para status=failed em maxAttempts)
 *
 * Modos de execução:
 *   - Embarcado: import { start } from 'workers/outboxWorker.js' dentro de outro processo
 *   - Standalone: `node src/workers/outboxWorker.js` (bloco if no final do arquivo)
 *
 * Handlers atuais: STUBS. Integração real com Agenda / N.O.N. está fora de
 * escopo desta task — entram quando esses módulos existirem.
 */

import {
  fetchPending,
  markDone,
  markFailed,
  OutboxStatus,
} from '../services/outboxService.js';
import { SideEffectType } from '../services/statusMachine.js';

// ─── Config ────────────────────────────────────────────────────────────────

const DEFAULT_POLL_MS = 5000;
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_MAX_ATTEMPTS = 5;

function getConfigFromEnv() {
  return {
    pollMs: Number(process.env.OUTBOX_POLL_MS) || DEFAULT_POLL_MS,
    batchSize: Number(process.env.OUTBOX_BATCH_SIZE) || DEFAULT_BATCH_SIZE,
    maxAttempts: Number(process.env.OUTBOX_MAX_ATTEMPTS) || DEFAULT_MAX_ATTEMPTS,
  };
}

// ─── Handlers (stubs) ──────────────────────────────────────────────────────
// Shape: async (event) => void. Throws em falha → markFailed.
// O markDone é chamado pelo loop se o handler não lança.

async function handleAgendaOpen(event) {
  // TODO: chamar o módulo Agenda (HTTP/direct) com event.payload
  // Hoje é stub — o evento LeadHistory.agenda_scheduled já foi escrito no
  // leadTransitionService na mesma transação da mudança de status.
  logWorker(`agenda_open stub → lead ${event.aggregateId} payload=${JSON.stringify(event.payload)}`);
}

async function handleNonOpenOrCreate(event) {
  // TODO: resolver N.O.N. real (open se existir, create se não) e depois
  // escrever LeadHistory.non_generated com o nonId retornado (via
  // leadHistoryService.add, fora de transação — é histórico descritivo).
  // Stub: loga e retorna sucesso.
  logWorker(`non_open_or_create stub → lead ${event.aggregateId} mode=${event.payload?.mode}`);
}

export const HANDLERS = Object.freeze({
  [SideEffectType.AGENDA_OPEN]: handleAgendaOpen,
  [SideEffectType.NON_OPEN_OR_CREATE]: handleNonOpenOrCreate,
});

// ─── Processamento ─────────────────────────────────────────────────────────

function logWorker(message) {
  // Log estruturado simples; migrar para pino/winston quando houver stack de logs.
  // eslint-disable-next-line no-console
  console.log(`[outboxWorker ${new Date().toISOString()}] ${message}`);
}

/**
 * Processa um lote de eventos pendentes.
 * Expõe o core logic pra testes unitários (sem timers).
 *
 * @param {object} [opts]
 * @param {number} [opts.batchSize]
 * @param {number} [opts.maxAttempts]
 * @param {Record<string, Function>} [opts.handlers] - override para testes
 * @returns {Promise<{ processed: number, failed: number, skipped: number }>}
 */
export async function processBatch(opts = {}) {
  const { batchSize = DEFAULT_BATCH_SIZE, maxAttempts = DEFAULT_MAX_ATTEMPTS, handlers = HANDLERS } = opts;

  const pending = await fetchPending({ limit: batchSize });
  if (pending.length === 0) {
    return { processed: 0, failed: 0, skipped: 0 };
  }

  let processed = 0;
  let failed = 0;
  let skipped = 0;

  for (const event of pending) {
    const handler = handlers[event.eventType];

    if (!handler) {
      // Evento sem handler é erro operacional — marca falha e registra
      // um lastError claro. Isso acelera detecção de drift entre outbox
      // producer e consumer.
      try {
        await markFailed(event.id, `No handler registered for eventType="${event.eventType}"`, { maxAttempts });
      } catch (err) {
        logWorker(`markFailed (no-handler) falhou para evento ${event.id}: ${err?.message}`);
      }
      skipped += 1;
      continue;
    }

    try {
      await handler(event);
      await markDone(event.id);
      processed += 1;
    } catch (err) {
      try {
        await markFailed(event.id, err, { maxAttempts });
      } catch (markErr) {
        logWorker(`markFailed falhou para evento ${event.id}: ${markErr?.message}`);
      }
      failed += 1;
      logWorker(`evento ${event.id} (${event.eventType}) falhou: ${err?.message}`);
    }
  }

  return { processed, failed, skipped };
}

// ─── Loop ──────────────────────────────────────────────────────────────────

let intervalHandle = null;
let running = false;
let tickInFlight = false;

/**
 * Inicia o loop de polling. Idempotente — chamar start() múltiplas vezes
 * não cria múltiplos intervals.
 *
 * @param {object} [opts] - override via runtime (tem prioridade sobre env)
 * @returns {{ stop: () => void }}
 */
export function start(opts = {}) {
  if (running) {
    logWorker('start() chamado mas worker já está rodando — no-op');
    return { stop };
  }

  const config = { ...getConfigFromEnv(), ...opts };

  running = true;
  tickInFlight = false;

  const tick = async () => {
    if (tickInFlight) return; // evita sobreposição se handler demora mais que o poll
    tickInFlight = true;
    try {
      const summary = await processBatch({
        batchSize: config.batchSize,
        maxAttempts: config.maxAttempts,
      });
      if (summary.processed + summary.failed + summary.skipped > 0) {
        logWorker(
          `tick → processed=${summary.processed} failed=${summary.failed} skipped=${summary.skipped}`,
        );
      }
    } catch (err) {
      logWorker(`tick exception não tratada: ${err?.message}`);
    } finally {
      tickInFlight = false;
    }
  };

  logWorker(`iniciando loop (poll=${config.pollMs}ms, batch=${config.batchSize}, maxAttempts=${config.maxAttempts})`);
  intervalHandle = setInterval(tick, config.pollMs);
  // Primeiro tick imediato pra não esperar o primeiro pollMs
  queueMicrotask(tick);

  return { stop };
}

/**
 * Para o loop. Idempotente.
 * Nota: se um handler está em execução no momento da chamada, ele termina
 * normalmente (não interrompe). O próximo tick não acontece.
 */
export function stop() {
  if (!running) return;
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  running = false;
  logWorker('worker parado');
}

export function isRunning() {
  return running;
}

export const outboxWorker = Object.freeze({
  start,
  stop,
  processBatch,
  isRunning,
  HANDLERS,
  OutboxStatus,
});

// ─── Entry point standalone ────────────────────────────────────────────────
// Permite rodar como processo independente:
//   node src/workers/outboxWorker.js
// O guard via import.meta.url evita disparar o loop quando o módulo é apenas
// importado (ex.: em testes).
const isDirectRun = (() => {
  try {
    return import.meta.url === `file://${process.argv[1]}` ||
           import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'));
  } catch {
    return false;
  }
})();

if (isDirectRun) {
  start();

  // Graceful shutdown
  const shutdown = (signal) => {
    logWorker(`recebido ${signal}, parando...`);
    stop();
    // Dá um beat pro tick em curso terminar; process.exit depois
    setTimeout(() => process.exit(0), 500);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
