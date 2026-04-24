import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  withLock,
  withQueueLock,
  createMemoryLockBackend,
  createRedisLockBackend,
  redisLock,
  QUEUE_LOCK_KEY_PREFIX,
  DEFAULT_QUEUE_LOCK_TTL_MS,
} from '../utils/redisLock.js';

// ─── In-memory backend ────────────────────────────────────────────────────

describe('createMemoryLockBackend — acquire/release', () => {
  it('adquire lock em chave livre', async () => {
    const backend = createMemoryLockBackend();
    expect(await backend.acquire('k', 'tokenA', 1000)).toBe(true);
  });

  it('rejeita segunda aquisição enquanto lock está ativo', async () => {
    const backend = createMemoryLockBackend();
    await backend.acquire('k', 'tokenA', 5000);
    expect(await backend.acquire('k', 'tokenB', 5000)).toBe(false);
  });

  it('release com token correto libera', async () => {
    const backend = createMemoryLockBackend();
    await backend.acquire('k', 'tokenA', 5000);
    await backend.release('k', 'tokenA');
    expect(await backend.acquire('k', 'tokenB', 5000)).toBe(true);
  });

  it('release com token errado NÃO libera (proteção atômica)', async () => {
    const backend = createMemoryLockBackend();
    await backend.acquire('k', 'tokenA', 5000);
    await backend.release('k', 'tokenIntruso'); // não deveria liberar
    expect(await backend.acquire('k', 'tokenB', 5000)).toBe(false);
    expect(backend._inspect('k').token).toBe('tokenA');
  });

  it('lock expirado pode ser re-adquirido', async () => {
    const backend = createMemoryLockBackend();
    await backend.acquire('k', 'tokenA', 1); // TTL 1ms
    await new Promise((r) => setTimeout(r, 5));
    expect(await backend.acquire('k', 'tokenB', 1000)).toBe(true);
  });
});

// ─── Redis backend ────────────────────────────────────────────────────────

describe('createRedisLockBackend', () => {
  it('acquire usa SET NX PX e reporta OK', async () => {
    const mockRedis = {
      set: vi.fn().mockResolvedValue('OK'),
      eval: vi.fn(),
    };
    const backend = createRedisLockBackend(mockRedis);
    const r = await backend.acquire('k', 'tok', 5000);
    expect(r).toBe(true);
    expect(mockRedis.set).toHaveBeenCalledWith('k', 'tok', 'PX', 5000, 'NX');
  });

  it('acquire retorna false quando SET retorna null (já existia)', async () => {
    const mockRedis = {
      set: vi.fn().mockResolvedValue(null),
      eval: vi.fn(),
    };
    const backend = createRedisLockBackend(mockRedis);
    expect(await backend.acquire('k', 'tok', 5000)).toBe(false);
  });

  it('release chama EVAL com KEYS=1 e script Lua de token-match', async () => {
    const mockRedis = {
      set: vi.fn(),
      eval: vi.fn().mockResolvedValue(1),
    };
    const backend = createRedisLockBackend(mockRedis);
    await backend.release('k', 'tok');
    expect(mockRedis.eval).toHaveBeenCalledWith(
      expect.stringContaining("redis.call('get', KEYS[1]) == ARGV[1]"),
      1,
      'k',
      'tok',
    );
  });

  it('rejeita construção sem cliente Redis', () => {
    expect(() => createRedisLockBackend(null)).toThrow(/cliente Redis/);
  });
});

// ─── withLock ─────────────────────────────────────────────────────────────

describe('withLock — caminho feliz', () => {
  it('adquire, executa fn, libera, retorna valor de fn', async () => {
    const backend = createMemoryLockBackend();
    const r = await withLock('k', 5000, async () => 'valor', { backend });
    expect(r).toBe('valor');
    expect(backend._inspect('k')).toBeNull(); // liberado
  });

  it('fn recebe contexto livre — lock bloqueia concorrência', async () => {
    const backend = createMemoryLockBackend();
    const seen = [];
    const runner = async (label) => {
      try {
        return await withLock('k', 5000, async () => {
          seen.push(`start-${label}`);
          await new Promise((r) => setTimeout(r, 10));
          seen.push(`end-${label}`);
          return label;
        }, { backend });
      } catch (err) {
        if (err.statusCode === 409) return `conflict-${label}`;
        throw err;
      }
    };

    const results = await Promise.all([runner('A'), runner('B')]);
    // Um dos dois deve ter batido 409 (lock exclusivo — sem espera)
    expect(results.filter((v) => typeof v === 'string' && v.startsWith('conflict-'))).toHaveLength(1);
    // O vencedor rodou atomicamente
    expect(seen).toEqual(['start-A', 'end-A']);
  });
});

describe('withLock — falhas e cleanup', () => {
  it('lança 409 quando não consegue adquirir', async () => {
    const backend = createMemoryLockBackend();
    await backend.acquire('k', 'pre-existing', 5000);

    await expect(
      withLock('k', 5000, async () => 'não executado', { backend }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('NÃO invoca fn quando lock não foi adquirido', async () => {
    const backend = createMemoryLockBackend();
    await backend.acquire('k', 'intruso', 5000);
    const fn = vi.fn();
    await withLock('k', 5000, fn, { backend }).catch(() => {});
    expect(fn).not.toHaveBeenCalled();
  });

  it('libera lock MESMO quando fn lança — erro do fn é propagado', async () => {
    const backend = createMemoryLockBackend();
    const fnErr = new Error('erro do usuário');
    await expect(
      withLock('k', 5000, async () => { throw fnErr; }, { backend }),
    ).rejects.toBe(fnErr);
    // Lock foi liberado (próxima aquisição funciona)
    expect(await backend.acquire('k', 'nova', 5000)).toBe(true);
  });

  it('erro no release é logado mas NÃO mascara retorno/erro do fn', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const backend = {
      acquire: vi.fn().mockResolvedValue(true),
      release: vi.fn().mockRejectedValue(new Error('redis down')),
    };

    const r = await withLock('k', 5000, async () => 'sucesso', { backend });
    expect(r).toBe('sucesso');
    expect(consoleSpy).toHaveBeenCalledWith(
      '[redisLock] release falhou:',
      'redis down',
    );

    consoleSpy.mockRestore();
  });
});

describe('withLock — validação de entrada', () => {
  it('rejeita key não-string ou vazia', async () => {
    const backend = createMemoryLockBackend();
    await expect(withLock('', 5000, async () => {}, { backend })).rejects.toThrow(/key/);
    await expect(withLock(null, 5000, async () => {}, { backend })).rejects.toThrow(/key/);
  });

  it('rejeita ttlMs inválido', async () => {
    const backend = createMemoryLockBackend();
    await expect(withLock('k', 0, async () => {}, { backend })).rejects.toThrow(/ttlMs/);
    await expect(withLock('k', -1, async () => {}, { backend })).rejects.toThrow(/ttlMs/);
    await expect(withLock('k', 'abc', async () => {}, { backend })).rejects.toThrow(/ttlMs/);
  });

  it('rejeita fn não-função', async () => {
    const backend = createMemoryLockBackend();
    await expect(withLock('k', 5000, 'não é função', { backend })).rejects.toThrow(/fn/);
  });
});

// ─── withQueueLock ────────────────────────────────────────────────────────

describe('withQueueLock', () => {
  it('monta a chave com prefixo crm:queue:branch:<id>', async () => {
    const backend = {
      acquire: vi.fn().mockResolvedValue(true),
      release: vi.fn().mockResolvedValue(),
    };
    await withQueueLock(42, async () => 'x', { backend });
    expect(backend.acquire).toHaveBeenCalledWith(
      'crm:queue:branch:42',
      expect.any(String),
      DEFAULT_QUEUE_LOCK_TTL_MS,
    );
  });

  it('usa TTL de 5000ms por padrão (plan §2.5)', () => {
    expect(DEFAULT_QUEUE_LOCK_TTL_MS).toBe(5000);
    expect(QUEUE_LOCK_KEY_PREFIX).toBe('crm:queue:branch:');
  });

  it('rejeita branchId inválido', async () => {
    const backend = createMemoryLockBackend();
    await expect(withQueueLock(0, async () => {}, { backend })).rejects.toThrow(/branchId/);
    await expect(withQueueLock('abc', async () => {}, { backend })).rejects.toThrow(/branchId/);
  });

  it('normaliza branchId string para int', async () => {
    const backend = {
      acquire: vi.fn().mockResolvedValue(true),
      release: vi.fn().mockResolvedValue(),
    };
    await withQueueLock('7', async () => {}, { backend });
    expect(backend.acquire).toHaveBeenCalledWith(
      'crm:queue:branch:7',
      expect.any(String),
      expect.any(Number),
    );
  });
});

// ─── Fachada ──────────────────────────────────────────────────────────────

describe('redisLock facade', () => {
  it('expõe withLock, withQueueLock, factories, constantes', () => {
    expect(typeof redisLock.withLock).toBe('function');
    expect(typeof redisLock.withQueueLock).toBe('function');
    expect(typeof redisLock.createMemoryLockBackend).toBe('function');
    expect(typeof redisLock.createRedisLockBackend).toBe('function');
    expect(redisLock.QUEUE_LOCK_KEY_PREFIX).toBe('crm:queue:branch:');
    expect(redisLock.DEFAULT_QUEUE_LOCK_TTL_MS).toBe(5000);
  });

  it('está congelada', () => {
    expect(Object.isFrozen(redisLock)).toBe(true);
  });
});
