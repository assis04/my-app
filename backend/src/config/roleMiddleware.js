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
 * Usuários com '*' ou cargo 'ADM' passam automaticamente.
 * Uso: router.get('/leads', authMiddleware, authorizePermission('leads:read:branch'), handler)
 */
export function authorizePermission(requiredPermission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado.' });
    }
    
    const permissions = req.user.permissions || [];
    const isAdm = req.user.role === 'ADM' || req.user.role === 'admin' || req.user.role === 'Administrador';
    
    // Curinga ADM
    if (permissions.includes('*') || isAdm) return next();
    
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
 * Uso: authorizeAnyPermission(['leads:read:all', 'leads:read:branch'])
 */
export function authorizeAnyPermission(permissionList) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado.' });
    }
    
    const permissions = req.user.permissions || [];
    const isAdm = req.user.role === 'ADM' || req.user.role === 'admin' || req.user.role === 'Administrador';
    
    // Curinga ADM
    if (permissions.includes('*') || isAdm) return next();
    
    const hasAny = permissionList.some(p => permissions.includes(p));
    if (!hasAny) {
      return res.status(403).json({ 
        message: 'Acesso negado: permissão insuficiente.'
      });
    }
    
    next();
  };
}
