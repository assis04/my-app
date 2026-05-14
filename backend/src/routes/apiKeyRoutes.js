/**
 * apiKeyRoutes — gestão admin de API keys (para origens externas).
 * Auth: JWT + role ADM/Administrador (não usa permissão granular pra
 * simplificar — segredo crítico, restrito ao top role).
 */
import { Router } from 'express';
import { authMiddleware } from '../config/authMiddleware.js';
import { authorizeRoles } from '../config/roleMiddleware.js';
import { validate } from '../config/validateMiddleware.js';
import { createApiKeySchema } from '../validators/apiKeyValidator.js';
import * as apiKeyController from '../controllers/apiKeyController.js';

const router = Router();

const adminOnly = [authMiddleware, authorizeRoles('ADM', 'Administrador')];

router.get('/', adminOnly, apiKeyController.list);
router.post('/', adminOnly, validate(createApiKeySchema), apiKeyController.create);
router.put('/:id/revoke', adminOnly, apiKeyController.revoke);

export default router;
