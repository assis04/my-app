/**
 * Endpoints da documentação OpenAPI.
 *
 * Acesso: somente ADM/Administrador. O Swagger UI é servido pelo próprio
 * backend e funciona quando admin abre direto da mesma origem (cookie
 * accessToken vai junto). Pra "Try it out" funcionar dentro da UI, o
 * requestInterceptor adiciona credentials:'include' nas chamadas internas.
 *
 * Spec é gerado lazy + cacheado (ver openapi/index.js#getOpenApiSpec).
 */
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { authMiddleware } from '../config/authMiddleware.js';
import { authorizeRoles } from '../config/roleMiddleware.js';
import { getOpenApiSpec } from '../openapi/index.js';

const router = Router();

const adminOnly = [authMiddleware, authorizeRoles('ADM', 'Administrador')];

const swaggerUiOptions = {
  customSiteTitle: 'Ambisistem CRM API · Docs',
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'list',
    defaultModelsExpandDepth: 1,
    // Garante que fetch da UI inclua o cookie de auth ao chamar a própria API.
    requestInterceptor: (req) => {
      req.credentials = 'include';
      return req;
    },
  },
};

router.get('/docs.json', adminOnly, (req, res) => {
  res.json(getOpenApiSpec());
});

router.use('/docs', adminOnly, swaggerUi.serveFiles(getOpenApiSpec(), swaggerUiOptions), swaggerUi.setup(getOpenApiSpec(), swaggerUiOptions));

export default router;
