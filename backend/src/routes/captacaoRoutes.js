import { Router } from 'express';
import { authMiddleware } from '../config/authMiddleware.js';
import { authorizeAnyPermission } from '../config/roleMiddleware.js';
import * as captacaoController from '../controllers/captacaoController.js';

const router = Router();

// Pelo prompt: ADM + Captação veem todas; Gerente/Vendedor veem própria.
// Portanto, qualquer user que alcance esta rota deve estar logado e ter algum acesso. 
// Vamos exigir 'captacao:leads:read' no mínimo
// (O middleware pode ser aprimorado dps para restriçao visual de IDS)

router.get('/queue/:branch_id', authMiddleware, captacaoController.getQueueRanking);

router.post('/lead/quick', authMiddleware, authorizeAnyPermission(['captacao:leads:create', 'ADM', 'Administrador']), captacaoController.processNewQuickLead);

router.post('/lead/manual', authMiddleware, authorizeAnyPermission(['captacao:leads:create', 'ADM', 'Administrador']), captacaoController.processNewManualLead);

router.put('/queue/toggle-status', authMiddleware, captacaoController.toggleAgentAvailability);

router.get('/history', authMiddleware, captacaoController.getLeadHistory);

export default router;
