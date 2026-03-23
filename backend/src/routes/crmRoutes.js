import { Router } from 'express';
import { authMiddleware } from '../config/authMiddleware.js';
import * as crmController from '../controllers/crmController.js';

const router = Router();

// Endpoint para buscar orçamentos (novo) com filtros
router.get('/orcamentos', authMiddleware, crmController.getOrcamentos);

export default router;
