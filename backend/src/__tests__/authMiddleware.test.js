import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

// Mock env
vi.mock('../config/env.js', () => ({
  env: {
    JWT_ACCESS_SECRET: 'test-access-secret-that-is-32-chars-long!!',
    JWT_REFRESH_SECRET: 'test-refresh-secret-that-is-32-chars-long!',
    NODE_ENV: 'test',
  },
}));

// Mock blacklist (evita conexão Redis em teste — timeout de 10s com ioredis)
const isTokenBlacklistedMock = vi.fn().mockResolvedValue(false);
vi.mock('../utils/tokenBlacklist.js', () => ({
  isTokenBlacklisted: isTokenBlacklistedMock,
}));

const { authMiddleware, _resetRedisFailLogThrottleForTests } = await import('../config/authMiddleware.js');

function createMockReqResNext(cookies = {}, headers = {}) {
  const req = { cookies, headers };
  const res = {
    _status: null,
    _json: null,
    status(code) { this._status = code; return this; },
    json(data) { this._json = data; return this; },
  };
  const next = vi.fn();
  return { req, res, next };
}

const ACCESS_SECRET = 'test-access-secret-that-is-32-chars-long!!';
const REFRESH_SECRET = 'test-refresh-secret-that-is-32-chars-long!';

describe('authMiddleware', () => {
  it('should authenticate with valid access token from cookie', async () => {
    const token = jwt.sign({ id: 1, email: 'test@test.com', role: 'ADM' }, ACCESS_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
    const { req, res, next } = createMockReqResNext({ accessToken: token });

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.id).toBe(1);
    expect(req.user.email).toBe('test@test.com');
  });

  it('should authenticate with valid Bearer token from header', async () => {
    const token = jwt.sign({ id: 2, email: 'bearer@test.com', role: 'RH' }, ACCESS_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
    const { req, res, next } = createMockReqResNext({}, { authorization: `Bearer ${token}` });

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.id).toBe(2);
  });

  it('should reject when no token is provided', () => {
    const { req, res, next } = createMockReqResNext();

    authMiddleware(req, res, next);

    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject refresh token used as access token', () => {
    const token = jwt.sign({ id: 1, email: 'test@test.com', refresh: true }, ACCESS_SECRET, { algorithm: 'HS256', expiresIn: '7d' });
    const { req, res, next } = createMockReqResNext({ accessToken: token });

    authMiddleware(req, res, next);

    expect(res._status).toBe(401);
    expect(res._json.message).toContain('refresh token');
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject token signed with wrong secret', () => {
    const token = jwt.sign({ id: 1, email: 'test@test.com' }, 'wrong-secret-that-is-long-enough-32ch', { algorithm: 'HS256', expiresIn: '1h' });
    const { req, res, next } = createMockReqResNext({ accessToken: token });

    authMiddleware(req, res, next);

    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject expired token', () => {
    const token = jwt.sign({ id: 1, email: 'test@test.com' }, ACCESS_SECRET, { algorithm: 'HS256', expiresIn: '-1s' });
    const { req, res, next } = createMockReqResNext({ accessToken: token });

    authMiddleware(req, res, next);

    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject token signed with refresh secret (separate secrets)', () => {
    const token = jwt.sign({ id: 1, email: 'test@test.com' }, REFRESH_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
    const { req, res, next } = createMockReqResNext({ accessToken: token });

    authMiddleware(req, res, next);

    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('authMiddleware — fail-open do Redis blacklist', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    _resetRedisFailLogThrottleForTests();
    isTokenBlacklistedMock.mockReset();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('aceita o token e loga quando isTokenBlacklisted lança (fail-open com alarme)', async () => {
    isTokenBlacklistedMock.mockRejectedValueOnce(new Error('ECONNREFUSED redis'));
    const token = jwt.sign({ id: 1, email: 'test@test.com', role: 'ADM' }, ACCESS_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
    const { req, res, next } = createMockReqResNext({ accessToken: token });

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.id).toBe(1);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy.mock.calls[0][0]).toMatch(/\[SECURITY\].*Redis blacklist indispon/);
  });

  it('throttle: 5 falhas seguidas dentro do intervalo geram apenas 1 linha de log', async () => {
    isTokenBlacklistedMock.mockRejectedValue(new Error('redis down'));
    const token = jwt.sign({ id: 1, email: 'test@test.com', role: 'ADM' }, ACCESS_SECRET, { algorithm: 'HS256', expiresIn: '1h' });

    consoleErrorSpy.mockClear();

    for (let i = 0; i < 5; i += 1) {
      const { req, res, next } = createMockReqResNext({ accessToken: token });
      await authMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
    }

    const securityLogs = consoleErrorSpy.mock.calls.filter(
      (args) => typeof args[0] === 'string' && args[0].includes('[SECURITY]'),
    );
    expect(securityLogs).toHaveLength(1);
  });
});
