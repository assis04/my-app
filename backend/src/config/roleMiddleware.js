import { isAdminRole } from '../utils/roles.js';

/**
 * Middleware que aceita apenas usuários com o role exato (por nome).
 * Uso: router.use(authorizeRoles('ADM', 'RH'))
 */
export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Acesso negado: Não tens permissão para aceder a este recurso.'
      });
    }
    next();
  };
}

/**
 * Middleware RBAC que verifica permissão granular no formato 'resource:action:scope'.
 * Usuários com '*' ou cargo ADM passam automaticamente.
 */
export function authorizePermission(requiredPermission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado.' });
    }

    const permissions = req.user.permissions || [];

    if (permissions.includes('*') || isAdminRole(req.user.role)) return next();

    if (!permissions.includes(requiredPermission)) {
      return res.status(403).json({
        message: `Acesso negado: permissão '${requiredPermission}' necessária.`
      });
    }

    next();
  };
}

/**
 * Middleware que verifica se o usuário possui AO MENOS UMA das permissões listadas.
 */
export function authorizeAnyPermission(permissionList) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado.' });
    }

    const permissions = req.user.permissions || [];

    if (permissions.includes('*') || isAdminRole(req.user.role)) return next();

    const hasAny = permissionList.some(p => permissions.includes(p));
    if (!hasAny) {
      return res.status(403).json({
        message: 'Acesso negado: permissão insuficiente.'
      });
    }

    next();
  };
}
