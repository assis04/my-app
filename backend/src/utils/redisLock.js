/**
 * redisLock — primitiva de lock distribuído com fallback in-memory.
 *
 * Fonte de verdade: specs/crm-plan.md §2.5 / Task #17
 *
 * API pública:
 *   withLock(key, ttlMs, fn, opts?) — adquire lock, roda fn, libera no finally
 *   withQueueLock(branchId, fn, opts?) — atalho pra Fila da Vez (§2.5)
 *
 * Backends:
 *   - Redis (produção e staging): SET NX PX + release via Lua atômico
 *   - In-memory (dev local sem Redis): Map com TTL via timestamp
 *
 * Propriedades garantidas:
 *   1. Exclusividade — dois chamadores não obtêm o mesmo lock simultaneamente
 *   2. Release atômico — só o "dono" (via token) libera o lock. Se o TTL
 *      expirou e outro processo pegou, tentar release com o token antigo
 *      é NO-OP (não libera o lock do novo dono).
 *   3. TTL de segurança — se o processo morrer com lock em mãos, o Redis
 *      expira a chave automaticamente.
 *   4. Erros do fn não vazam como erros de lock — o erro original é
 *      propagado, erros de release são apenas logados.
 */

import { randomUUID } from 'node:crypto';
import AppError from './AppError.js';

// ─── Release script (Lua) — atômico no Redis ──────────────────────────────
// KEYS[1] = chave, ARGV[1] = token esperado
// Só deleta se o valor bater com nosso token. Previne release de um lock
// que já foi recuperado por outro processo após expirar o TTL.
const RELEASE_SCRIPT = `
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
else
  return 0
end
`;

// ─── In-memory backend ────────────────────────────────────────────────────
// Usado em dev local sem Redis. Um único processo — suficiente pra rodar
// `npm run dev` e smoke tests. NÃO usar em produção multi-instância.

export function createMemoryLockBackend() {
  const store = new Map(); // key → { token, expiresAt }

  function purgeIfExpired(key) {
    const entry = store.get(key);
    if (entry && entry.expiresAt <= Date.now()) {
      store.delete(key);
    }
  }

  return {
    async acquire(key, token, ttlMs) {
      purgeIfExpired(key);
      if (store.has(key)) return false;
      store.set(key, { token, expiresAt: Date.now() + ttlMs });
      return true;
    },
    async release(key, token) {
      const entry = store.get(key);
      if (entry && entry.token === token) {
        store.delete(key);
      }
    },
    // Exposto para testes / diagnóstico
    _inspect(key) {
      return store.get(key) ?? null;
    },
  };
}

// ─── Redis backend ────────────────────────────────────────────────────────

export function createRedisLockBackend(redisClient) {
  if (!redisClient) {
    throw new Error('createRedisLockBackend requer um cliente Redis.');
  }
  return {
    async acquire(key, token, ttlMs) {
      // SET key value PX ttlMs NX → retorna "OK" se setou, null se já existia
      const result = await redisClient.set(key, token, 'PX', ttlMs, 'NX');
      return result === 'OK';
    },
    async release(key, token) {
      await redisClient.eval(RELEASE_SCRIPT, 1, key, token);
    },
  };
}

// ─── Default backend (lazy, por env) ──────────────────────────────────────

let _defaultBackend = null;
let _warnedInMemory = false;

export async function getDefaultBackend() {
  if (_defaultBackend) return _defaultBackend;

  const hasRedisEnv = Boolean(process.env.REDIS_HOST || process.env.REDIS_URL);
  if (hasRedisEnv) {
    // Lazy-import pra não conectar no Redis no boot de módulos que só fazem
    // lock em execução (evita conexões dangling em testes)
    const mod = await import('../config/redis.js');
    _defaultBackend = createRedisLockBackend(mod.default);
  } else {
    _defaultBackend = createMemoryLockBackend();
    if (!_warnedInMemory) {
      // eslint-disable-next-line no-console
      console.warn(
        '[redisLock] REDIS_HOST/REDIS_URL não definida — usando mutex IN-MEMORY. ' +
          'Seguro apenas em dev single-process. NÃO usar em produção.',
      );
      _warnedInMemory = true;
    }
  }
  return _defaultBackend;
}

// ─── API pública ──────────────────────────────────────────────────────────

/**
 * Executa `fn` dentro de um lock identificado por `key`.
 *
 * @param {string} key — identificador do recurso (ex.: "crm:queue:branch:3")
 * @param {number} ttlMs — tempo de vida do lock em ms
 * @param {() => Promise<T>} fn — função a executar sob o lock
 * @param {object} [opts]
 * @param {object} [opts.backend] — override do backend (pra testes)
 * @returns {Promise<T>}
 * @throws {AppError} 409 quando não foi possível adquirir o lock
 */
export async function withLock(key, ttlMs, fn, opts = {}) {
  if (typeof key !== 'string' || key.trim().length === 0) {
    throw new AppError('key deve ser string não-vazia.', 400);
  }
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
    throw new AppError('ttlMs deve ser número positivo.', 400);
  }
  if (typeof fn !== 'function') {
    throw new AppError('fn deve ser função.', 400);
  }

  const backend = opts.backend ?? (await getDefaultBackend());
  const token = randomUUID();

  const acquired = await backend.acquire(key, token, ttlMs);
  if (!acquired) {
    throw new AppError('Recurso em uso, tente novamente.', 409);
  }

  try {
    return await fn();
  } finally {
    try {
      await backend.release(key, token);
    } catch (releaseErr) {
      // Não suprime o erro original do fn (se houver). Apenas logamos —
      // próximo TTL vai liberar o lock naturalmente se o release falhou.
      // eslint-disable-next-line no-console
      console.error('[redisLock] release falhou:', releaseErr?.message);
    }
  }
}

// ─── Atalho específico pra Fila da Vez (Task #18) ─────────────────────────

export const QUEUE_LOCK_KEY_PREFIX = 'crm:queue:branch:';
export const DEFAULT_QUEUE_LOCK_TTL_MS = 5000;

/**
 * Executa `fn` dentro do lock da Fila da Vez de uma filial.
 * Chave: `crm:queue:branch:{branchId}` — TTL 5s (plan §2.5).
 */
export async function withQueueLock(branchId, fn, opts = {}) {
  const branchIdInt = Number(branchId);
  if (!Number.isInteger(branchIdInt) || branchIdInt <= 0) {
    throw new AppError('branchId deve ser inteiro positivo.', 400);
  }
  const key = `${QUEUE_LOCK_KEY_PREFIX}${branchIdInt}`;
  return withLock(key, DEFAULT_QUEUE_LOCK_TTL_MS, fn, opts);
}

export const redisLock = Object.freeze({
  withLock,
  withQueueLock,
  createMemoryLockBackend,
  createRedisLockBackend,
  QUEUE_LOCK_KEY_PREFIX,
  DEFAULT_QUEUE_LOCK_TTL_MS,
});
