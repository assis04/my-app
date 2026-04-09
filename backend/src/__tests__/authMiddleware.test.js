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

const { authMiddleware } = await import('../config/authMiddleware.js');

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
  it('should authenticate with valid access token from cookie', () => {
    const token = jwt.sign({ id: 1, email: 'test@test.com', role: 'ADM' }, ACCESS_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
    const { req, res, next } = createMockReqResNext({ accessToken: token });

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.id).toBe(1);
    expect(req.user.email).toBe('test@test.com');
  });

  it('should authenticate with valid Bearer token from header', () => {
    const token = jwt.sign({ id: 2, email: 'bearer@test.com', role: 'RH' }, ACCESS_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
    const { req, res, next } = createMockReqResNext({}, { authorization: `Bearer ${token}` });

    authMiddleware(req, res, next);

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
