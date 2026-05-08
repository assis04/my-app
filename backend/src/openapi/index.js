/**
 * Builder principal do spec OpenAPI 3.1.
 * Importa init.js (extendZodWithOpenApi) implicitamente via cada arquivo de path.
 *
 * Cobertura inicial: CRM (Leads, Accounts, Orçamentos). Outras áreas
 * (auth, users, filiais, equipes, tarefas) podem ser adicionadas registrando
 * mais arquivos em paths/ + chamada aqui.
 */
import './init.js';
import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';

import { registerLeadPaths } from './paths/leads.js';
import { registerAccountPaths } from './paths/accounts.js';
import { registerOrcamentoPaths } from './paths/orcamentos.js';

import { env } from '../config/env.js';

let cachedSpec = null;

function buildSpec() {
  const registry = new OpenAPIRegistry();

  // Bearer auth via cookie HTTP-only — Swagger UI exibe campo "Authorize" mas
  // não conseguirá injetar cookie automaticamente em chamadas (limite do CORS).
  // O usuário admin já está autenticado pra ver a doc, então as chamadas
  // partindo do mesmo browser herdam o cookie.
  registry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    description:
      'JWT em cookie HTTP-only (`auth_token`). Sessão é compartilhada com o ' +
      'frontend — Swagger UI funciona quando aberto da mesma origem.',
  });

  registerLeadPaths(registry);
  registerAccountPaths(registry);
  registerOrcamentoPaths(registry);

  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Ambisistem CRM API',
      version: '1.0.0',
      description:
        'Documentação automática gerada a partir dos schemas Zod.\n\n' +
        '**Escopo atual**: Leads, Contas/Pessoas e Orçamentos. ' +
        'Outras áreas (auth, RH, tarefas) serão adicionadas em iterações futuras.',
    },
    servers: [
      ...(env.NODE_ENV === 'production'
        ? [{ url: 'https://api-sys.moveisvalcenter.com.br', description: 'Produção' }]
        : []),
      { url: 'https://staging-api.moveisvalcenter.com.br', description: 'Staging' },
      { url: 'http://localhost:3001', description: 'Local' },
    ],
    tags: [
      { name: 'Leads', description: 'CRUD e transições de leads do CRM' },
      { name: 'Accounts', description: 'Contas/Pessoas — agregadores de leads' },
      { name: 'Orçamentos', description: 'Orçamentos (N.O.N.) vinculados ao lead' },
    ],
  });
}

/**
 * Spec é construído lazy + cacheado em memória. Construção é determinística,
 * então 1ª chamada paga o custo (poucos ms) e as seguintes são instantâneas.
 */
export function getOpenApiSpec() {
  if (!cachedSpec) cachedSpec = buildSpec();
  return cachedSpec;
}
