import { Router } from 'express';
import { authMiddleware } from '../config/authMiddleware.js';
import { authorizeAnyPermission } from '../config/roleMiddleware.js';
import { validate } from '../config/validateMiddleware.js';
import * as crmController from '../controllers/crmController.js';
import * as leadController from '../controllers/leadController.js';
import * as leadCrmController from '../controllers/leadCrmController.js';
import * as accountController from '../controllers/accountController.js';
import { uploadPlanta } from '../middlewares/uploadMiddleware.js';
import { createLeadSchema, updateLeadSchema, transferLeadsSchema, updateEtapaSchema, quickLeadSchema, manualLeadSchema, toggleStatusSchema, transitionStatusSchema, temperaturaSchema } from '../validators/leadValidator.js';

const router = Router();

// Orçamentos
router.get('/orcamentos', authMiddleware, crmController.getOrcamentos);

// Fila da Vez / Leads legado (Client)
router.get('/queue/:branch_id', authMiddleware, leadController.getQueueRanking);
router.post('/lead/quick', authMiddleware, authorizeAnyPermission(['captacao:leads:create', 'ADM', 'Administrador']), uploadPlanta.single('planta'), validate(quickLeadSchema), leadController.processNewQuickLead);
router.post('/lead/manual', authMiddleware, authorizeAnyPermission(['captacao:leads:create', 'ADM', 'Administrador']), uploadPlanta.single('planta'), validate(manualLeadSchema), leadController.processNewManualLead);
router.put('/queue/toggle-status', authMiddleware, validate(toggleStatusSchema), leadController.toggleAgentAvailability);
router.get('/history', authMiddleware, leadController.getLeadHistory);

// ─── Leads CRM (entidade Lead dedicada) ───────────────────────────────────
router.get('/leads', authMiddleware, authorizeAnyPermission(['crm:leads:read', 'ADM', 'Administrador']), leadCrmController.list);
router.get('/leads/:id', authMiddleware, authorizeAnyPermission(['crm:leads:read', 'ADM', 'Administrador']), leadCrmController.getById);
router.post('/leads', authMiddleware, authorizeAnyPermission(['crm:leads:create', 'ADM', 'Administrador']), validate(createLeadSchema), leadCrmController.create);
router.put('/leads/:id', authMiddleware, authorizeAnyPermission(['crm:leads:update', 'ADM', 'Administrador']), validate(updateLeadSchema), leadCrmController.update);
router.put('/leads/:id/status', authMiddleware, authorizeAnyPermission(['crm:leads:update', 'ADM', 'Administrador']), validate(transitionStatusSchema), leadCrmController.transitionStatus);
router.put('/leads/:id/temperatura', authMiddleware, authorizeAnyPermission(['crm:leads:update', 'ADM', 'Administrador']), validate(temperaturaSchema), leadCrmController.setTemperatura);
router.delete('/leads/:id', authMiddleware, authorizeAnyPermission(['crm:leads:delete', 'ADM', 'Administrador']), leadCrmController.remove);
router.put('/leads-transfer', authMiddleware, authorizeAnyPermission(['crm:leads:update', 'ADM', 'Administrador']), validate(transferLeadsSchema), leadCrmController.transfer);
router.put('/leads-etapa', authMiddleware, authorizeAnyPermission(['crm:leads:update', 'ADM', 'Administrador']), validate(updateEtapaSchema), leadCrmController.updateEtapa);

// Conta/Pessoa — somente leitura (criação embutida no fluxo do Lead)
router.get('/accounts', authMiddleware, authorizeAnyPermission(['crm:accounts:read', 'ADM', 'Administrador']), accountController.list);
router.get('/accounts/:id', authMiddleware, authorizeAnyPermission(['crm:accounts:read', 'ADM', 'Administrador']), accountController.getById);

export default router;
