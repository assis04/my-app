/**
 * apiKeyMiddleware — autenticação por API key (header X-Api-Key) para
 * rotas públicas que recebem dados de origens externas (landing pages).
 *
 * Diferente do authMiddleware (JWT em cookie), aqui validamos uma chave
 * persistida em DB com bcrypt hash. Sucesso → anexa `req.apiKey` ao request
 * pra controllers usarem (filialId, source).
 *
 * Falhas retornam 401 sem distinguir entre "chave ausente" e "chave inválida"
 * — evita leak de informação para atacantes.
 */
import { validateApiKey } from '../services/apiKeyService.js';

export async function apiKeyMiddleware(req, res, next) {
  const headerValue = req.headers['x-api-key'];
  if (!headerValue || typeof headerValue !== 'string') {
    return res.status(401).json({ message: 'API key obrigatória.' });
  }

  try {
    const apiKey = await validateApiKey(headerValue.trim());
    if (!apiKey) {
      return res.status(401).json({ message: 'API key inválida.' });
    }
    req.apiKey = apiKey;
    next();
  } catch (err) {
    console.error('[apiKeyMiddleware] erro inesperado:', err);
    return res.status(500).json({ message: 'Erro ao validar API key.' });
  }
}
