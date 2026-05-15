/**
 * apiKeyMiddleware — autenticação por API key (header X-Api-Key) para
 * rotas públicas que recebem dados de origens externas (landing pages).
 *
 * Diferente do authMiddleware (JWT em cookie), aqui validamos uma chave
 * persistida em DB com bcrypt hash. Sucesso → anexa `req.apiKey` ao request
 * pra controllers usarem (filialId, source).
 *
 * Defesa adicional: se a chave tiver `allowedOrigins` configurado, o request
 * só passa se o header Origin ou Referer bater com uma das URLs autorizadas.
 * Bloqueia uso da chave de páginas que não foram explicitamente liberadas
 * (ex: chave leakada copiada pra outro site).
 *
 * Falhas de chave retornam 401 sem distinguir entre "chave ausente" e
 * "chave inválida" — evita leak de informação. Falha de origem retorna 403
 * com mensagem clara (operador legítimo precisa entender o erro).
 */
import { validateApiKey } from '../services/apiKeyService.js';

/**
 * @param {string[]} allowed — URLs autorizadas (array vazio = sem restrição)
 * @param {string|undefined} origin — header Origin (scheme://host[:port])
 * @param {string|undefined} referer — header Referer (URL completa)
 */
export function isOriginAllowed(allowed, origin, referer) {
  if (!Array.isArray(allowed) || allowed.length === 0) return true;

  for (const entry of allowed) {
    let allowedUrl;
    try { allowedUrl = new URL(entry); } catch { continue; }

    // Match por Origin: scheme + host + porta. Usado em POSTs cross-origin
    // (browser sempre envia Origin nesse caso).
    if (origin && origin === allowedUrl.origin) return true;

    // Match por Referer: permite scope path-level. Se a URL cadastrada tem
    // path (ex: /lojas/guarulhos), o referer precisa começar com ele.
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        if (refererUrl.origin === allowedUrl.origin) {
          const allowedPath = allowedUrl.pathname.replace(/\/+$/, '');
          if (allowedPath === '' || refererUrl.pathname.startsWith(allowedPath)) {
            return true;
          }
        }
      } catch { /* referer inválido — ignora */ }
    }
  }
  return false;
}

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

    const origin = req.headers.origin;
    const referer = req.headers.referer || req.headers.referrer;
    if (!isOriginAllowed(apiKey.allowedOrigins, origin, referer)) {
      return res.status(403).json({
        message: 'Origem não autorizada para esta chave.',
      });
    }

    req.apiKey = apiKey;
    next();
  } catch (err) {
    console.error('[apiKeyMiddleware] erro inesperado:', err);
    return res.status(500).json({ message: 'Erro ao validar API key.' });
  }
}
