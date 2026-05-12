/**
 * apiKeyController — endpoints admin pra CRUD de API keys.
 *
 * Todas as rotas exigem authMiddleware + role ADM/Administrador
 * (definido no router). Plain key só aparece UMA VEZ no POST.
 */
import * as apiKeyService from '../services/apiKeyService.js';

export async function list(req, res, next) {
  try {
    const keys = await apiKeyService.listApiKeys();
    return res.json(keys);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { name, filialId, source, expiresAt } = req.body;
    const result = await apiKeyService.createApiKey(
      { name, filialId, source, expiresAt },
      req.user,
    );
    // 201 inclui plainKey — caller deve mostrar ao admin e descartar.
    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function revoke(req, res, next) {
  try {
    const updated = await apiKeyService.revokeApiKey(req.params.id, req.user);
    return res.json(updated);
  } catch (err) {
    next(err);
  }
}
