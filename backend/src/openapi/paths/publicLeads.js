/**
 * OpenAPI path — POST /api/public/leads.
 * Documenta o intake externo (landing pages) protegido por X-Api-Key.
 */
import '../init.js';
import { z } from 'zod';
import { publicLeadSchema } from '../../validators/publicLeadValidator.js';
import { ErrorResponse, ValidationErrorResponse } from '../schemas.js';

const TAG = 'Public Intake';

const publicLeadResponse = z
  .object({
    id: z.number().int(),
    message: z.string().openapi({ example: 'Lead recebido com sucesso.' }),
  })
  .openapi('PublicLeadResponse');

export function registerPublicLeadPaths(registry) {
  // Registra o security scheme da API key.
  registry.registerComponent('securitySchemes', 'apiKeyAuth', {
    type: 'apiKey',
    in: 'header',
    name: 'X-Api-Key',
    description:
      'Chave secreta gerada em /rh/api-keys. Formato: vlc_live_<hex>. ' +
      'Plain-text só é exibido uma vez no momento da criação.',
  });

  registry.registerPath({
    method: 'post',
    path: '/api/public/leads',
    summary: 'Recebe um lead de origem externa (landing page)',
    description:
      'Endpoint público autenticado por API key (X-Api-Key). Rate limit ' +
      'agressivo: 10 req/min por IP. Lead criado entra com `origemExterna: true`, ' +
      'sem responsável atribuído (preVendedorId=null). filialId vem da ApiKey.',
    tags: [TAG],
    security: [{ apiKeyAuth: [] }],
    request: {
      body: { content: { 'application/json': { schema: publicLeadSchema } } },
    },
    responses: {
      201: {
        description: 'Lead recebido',
        content: { 'application/json': { schema: publicLeadResponse } },
      },
      400: {
        description: 'Payload inválido',
        content: { 'application/json': { schema: ValidationErrorResponse } },
      },
      401: {
        description: 'API key ausente ou inválida',
        content: { 'application/json': { schema: ErrorResponse } },
      },
      429: {
        description: 'Rate limit excedido',
        content: { 'application/json': { schema: ErrorResponse } },
      },
    },
  });
}
