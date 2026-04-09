import { describe, it, expect, vi } from 'vitest';
import { authorizeRoles, authorizePermission, authorizeAnyPermission } from '../config/roleMiddleware.js';

function createMockReqResNext(user = null) {
  const req = { user };
  const res = {
    _status: null,
    _json: null,
    status(code) { this._status = code; return this; },
    json(data) { this._json = data; return this; },
  };
  const next = vi.fn();
  return { req, res, next };
}

describe('authorizeRoles', () => {
  it('should call next() when user has an allowed role', () => {
    const { req, res, next } = createMockReqResNext({ role: 'ADM' });
    authorizeRoles('ADM', 'RH')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should return 403 when user role is not allowed', () => {
    const { req, res, next } = createMockReqResNext({ role: 'VENDEDOR' });
    authorizeRoles('ADM', 'RH')(req, res, next);
    expect(res._status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 when no user is present', () => {
    const { req, res, next } = createMockReqResNext(null);
    authorizeRoles('ADM')(req, res, next);
    expect(res._status).toBe(403);
  });
});

describe('authorizePermission', () => {
  it('should pass for admin role (bypass)', () => {
    const { req, res, next } = createMockReqResNext({ role: 'ADM', permissions: [] });
    authorizePermission('rh:usuarios:read')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should pass for wildcard permission', () => {
    const { req, res, next } = createMockReqResNext({ role: 'CUSTOM', permissions: ['*'] });
    authorizePermission('rh:usuarios:read')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should pass when user has the exact permission', () => {
    const { req, res, next } = createMockReqResNext({ role: 'RH', permissions: ['rh:usuarios:read'] });
    authorizePermission('rh:usuarios:read')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should return 403 when user lacks the permission', () => {
    const { req, res, next } = createMockReqResNext({ role: 'RH', permissions: ['rh:usuarios:read'] });
    authorizePermission('rh:perfis:delete')(req, res, next);
    expect(res._status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when no user is present', () => {
    const { req, res, next } = createMockReqResNext(null);
    authorizePermission('rh:usuarios:read')(req, res, next);
    expect(res._status).toBe(401);
  });
});

describe('authorizeAnyPermission', () => {
  it('should pass when user has at least one listed permission', () => {
    const { req, res, next } = createMockReqResNext({
      role: 'VENDEDOR',
      permissions: ['leads:read:own', 'leads:create:own'],
    });
    authorizeAnyPermission(['leads:create:own', 'leads:delete:own'])(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should return 403 when user has none of the listed permissions', () => {
    const { req, res, next } = createMockReqResNext({
      role: 'VENDEDOR',
      permissions: ['leads:read:own'],
    });
    authorizeAnyPermission(['leads:delete:own', 'rh:usuarios:create'])(req, res, next);
    expect(res._status).toBe(403);
  });

  it('should bypass for admin role', () => {
    const { req, res, next } = createMockReqResNext({ role: 'ADM', permissions: [] });
    authorizeAnyPermission(['anything'])(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
