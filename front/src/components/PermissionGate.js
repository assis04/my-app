'use client';

import { useAuth } from '@/contexts/AuthContext';

/**
 * Componente de guarda de acesso.
 * Pode ser usado de duas formas:
 *
 * 1. Por role (compatibilidade legacy):
 *    <PermissionGate allowedRoles={['ADM', 'RH']}>...</PermissionGate>
 *
 * 2. Por permissão granular RBAC:
 *    <PermissionGate permission="rh:usuarios:create">...</PermissionGate>
 *    <PermissionGate permissions={['leads:read:all', 'leads:read:branch']}>...</PermissionGate>
 */
export const PermissionGate = ({ 
  allowedRoles, 
  permission, 
  permissions: permissionList,
  requireAll = false, // se true, exige TODAS as permissões da lista
  children, 
  fallback = null 
}) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) return null;
  if (!isAuthenticated || !user) return fallback;

  const userPermissions = user.permissions || [];
  const isAdm = user.role === 'ADM' || user.role === 'admin' || user.role === 'Administrador';
  const hasWildcard = userPermissions.includes('*') || isAdm;

  // ── Verificação por permissão granular (nova forma) ──────────────────────
  if (permission) {
    const allowed = hasWildcard || userPermissions.includes(permission);
    return allowed ? <>{children}</> : fallback;
  }

  if (permissionList && permissionList.length > 0) {
    const allowed = hasWildcard || (
      requireAll
        ? permissionList.every(p => userPermissions.includes(p))
        : permissionList.some(p => userPermissions.includes(p))
    );
    return allowed ? <>{children}</> : fallback;
  }

  // ── Verificação por role (compatibilidade) ───────────────────────────────
  if (!allowedRoles || allowedRoles.length === 0) {
    return <>{children}</>;
  }

  const hasRole = allowedRoles.includes(user.role);
  return hasRole ? <>{children}</> : fallback;
};
