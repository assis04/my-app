export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    // req.user vem do authMiddleware que executou antes
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Acesso negado: Não tens permissão para aceder a este recurso.' 
      });
    }
    next();
  };
}