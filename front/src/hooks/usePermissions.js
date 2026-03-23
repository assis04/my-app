'use client';

import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook RBAC: verifica se o usuário logado possui uma permission específica.
 * Suporta curinga (*) para ADM.
 *
 * @example
 * const { can } = usePermissions();
 * if (can('rh:usuarios:create')) { ... }
 */
export function usePermissions() {
  const { user } = useAuth();
  
  const permissions = user?.permissions || [];
  const isAdm = user?.role === 'ADM' || user?.role === 'admin' || user?.role === 'Administrador';
  const hasWildcard = permissions.includes('*') || isAdm;

  /**
   * Verifica se o usuário tem uma permissão específica.
   * @param {string} permission - ex: 'leads:read:branch'
   * @returns {boolean}
   */
  const can = (permission) => {
    if (!user) return false;
    if (hasWildcard) return true;
    return permissions.includes(permission);
  };

  /**
   * Verifica se o usuário tem ao menos uma das permissões listadas.
   * @param {string[]} permissionList
   * @returns {boolean}
   */
  const canAny = (permissionList) => {
    if (!user) return false;
    if (hasWildcard) return true;
    return permissionList.some(p => permissions.includes(p));
  };

  /**
   * Verifica se o usuário tem TODAS as permissões listadas.
   * @param {string[]} permissionList
   * @returns {boolean}
   */
  const canAll = (permissionList) => {
    if (!user) return false;
    if (hasWildcard) return true;
    return permissionList.every(p => permissions.includes(p));
  };

  const cannot = (permission) => !can(permission);

  return { can, cannot, canAny, canAll, permissions, isAdmin: hasWildcard };
}
