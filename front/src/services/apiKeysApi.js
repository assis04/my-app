import { api } from './api';

/**
 * Lista API keys (admin-only).
 * Hash nunca é retornado; plain key também não (só aparece no momento do POST).
 */
export const listApiKeys = async () => api('/api/admin/api-keys');

/**
 * Cria nova API key. A response inclui `plainKey` ÚNICA VEZ — caller
 * deve mostrar ao admin e descartar (não persistir no client).
 *
 * @param {object} payload
 * @param {string} payload.name — descritivo humano
 * @param {number|null} [payload.filialId]
 * @param {string|null} [payload.source]
 * @param {string|null} [payload.expiresAt] — ISO datetime
 * @param {string[]} [payload.allowedOrigins] — URLs autorizadas a usar a chave
 */
export const createApiKey = async (payload) =>
  api('/api/admin/api-keys', { body: payload });

/**
 * Revoga uma API key existente. Idempotente: erro se já estiver revogada.
 */
export const revokeApiKey = async (id) =>
  api(`/api/admin/api-keys/${id}/revoke`, { method: 'PUT' });
