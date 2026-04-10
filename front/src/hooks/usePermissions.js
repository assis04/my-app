'use client';

import { useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function usePermissions() {
  const { user } = useAuth();

  const permissions = user?.permissions || [];
  const isAdm = user?.role === 'ADM' || user?.role === 'admin' || user?.role === 'Administrador';
  const hasWildcard = permissions.includes('*') || isAdm;

  const can = useCallback((permission) => {
    if (!user) return false;
    if (hasWildcard) return true;
    return permissions.includes(permission);
  }, [user, hasWildcard, permissions]);

  const canAny = useCallback((permissionList) => {
    if (!user) return false;
    if (hasWildcard) return true;
    return permissionList.some(p => permissions.includes(p));
  }, [user, hasWildcard, permissions]);

  const canAll = useCallback((permissionList) => {
    if (!user) return false;
    if (hasWildcard) return true;
    return permissionList.every(p => permissions.includes(p));
  }, [user, hasWildcard, permissions]);

  const cannot = useCallback((permission) => !can(permission), [can]);

  return useMemo(() => ({
    can, cannot, canAny, canAll, permissions, isAdmin: hasWildcard
  }), [can, cannot, canAny, canAll, permissions, hasWildcard]);
}
