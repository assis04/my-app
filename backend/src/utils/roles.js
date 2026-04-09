/**
 * Constantes centralizadas de roles do sistema (backend).
 */
export const ADMIN_ROLES = ['ADM', 'Administrador', 'admin'];
export const MANAGER_ROLES = ['Gerente', 'GERENTE'];

export function isAdminRole(roleName) {
  return ADMIN_ROLES.includes(roleName);
}
