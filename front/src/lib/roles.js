/**
 * Constantes centralizadas de roles do sistema.
 * Usar SEMPRE estas constantes em vez de arrays inline.
 */

export const ADMIN_ROLES = ['ADM', 'Administrador', 'admin'];
export const SELLER_ROLES = ['Vendedor', 'Pré-vendedor', 'Pre-vendedor'];
export const MANAGER_ROLES = ['Gerente', 'GERENTE'];
export const HR_ROLES = ['RH', 'rh'];

export const isAdmin = (user) => ADMIN_ROLES.includes(user?.role);
export const isSeller = (user) => SELLER_ROLES.includes(user?.role);
export const isManager = (user) => MANAGER_ROLES.includes(user?.role);
export const isAdminOrHR = (user) => [...ADMIN_ROLES, ...HR_ROLES].includes(user?.role);
