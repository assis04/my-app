import { Router } from 'express';
import { authMiddleware } from '../config/authMiddleware.js';
import { authorizeAnyPermission } from '../config/roleMiddleware.js';
import { validate } from '../config/validateMiddleware.js';
import * as leadController from '../controllers/leadController.js';
import * as leadCrmController from '../controllers/leadCrmController.js';
import * as accountController from '../controllers/accountController.js';
import * as orcamentoController from '../controllers/orcamentoController.js';
import { uploadPlanta, validateUploadedFileMagicBytes } from '../middlewares/uploadMiddleware.js';
import { createLeadSchema, updateLeadSchema, transferLeadsSchema, updateEtapaSchema, quickLeadSchema, manualLeadSchema, toggleStatusSchema, transitionStatusSchema, temperaturaSchema, cancelLeadSchema, reactivateLeadSchema } from '../validators/leadValidator.js';
import { createOrcamentoSchema, transitionOrcamentoSchema, cancelOrcamentoSchema, reactivateOrcamentoSchema } from '../validators/orcamentoValidator.js';

const router = Router();

// ─── Orçamentos (N.O.N.) — entidade dedicada vinculada 1:1 ao Lead ─────────
router.get('/orcamentos', authMiddleware, authorizeAnyPermission(['crm:orcamentos:read', 'ADM', 'Administrador']), orcamentoController.list);
router.post('/orcamentos', authMiddleware, authorizeAnyPermission(['crm:orcamentos:create', 'ADM', 'Administrador']), validate(createOrcamentoSchema), orcamentoController.create);
router.get('/orcamentos/:id', authMiddleware, authorizeAnyPermission(['crm:orcamentos:read', 'ADM', 'Administrador']), orcamentoController.getById);
router.put('/orcamentos/:id/status', authMiddleware, authorizeAnyPermission(['crm:orcamentos:update', 'ADM', 'Administrador']), validate(transitionOrcamentoSchema), orcamentoController.transitionStatus);
router.put('/orcamentos/:id/cancel', authMiddleware, authorizeAnyPermission(['crm:orcamentos:update', 'ADM', 'Administrador']), validate(cancelOrcamentoSchema), orcamentoController.cancel);
router.put('/orcamentos/:id/reactivate', authMiddleware, authorizeAnyPermission(['crm:orcamentos:update', 'ADM', 'Administrador']), validate(reactivateOrcamentoSchema), orcamentoController.reactivate);
router.get('/leads/:id/orcamento', authMiddleware, authorizeAnyPermission(['crm:orcamentos:read', 'ADM', 'Administrador']), orcamentoController.getByLeadId);

// Fila da Vez / Leads legado (Client)
router.get('/queue/:branch_id', authMiddleware, leadController.getQueueRanking);
router.post('/lead/quick', authMiddleware, authorizeAnyPermission(['captacao:leads:create', 'ADM', 'Administrador']), uploadPlanta.single('planta'), validateUploadedFileMagicBytes, validate(quickLeadSchema), leadController.processNewQuickLead);
router.post('/lead/manual', authMiddleware, authorizeAnyPermission(['captacao:leads:create', 'ADM', 'Administrador']), uploadPlanta.single('planta'), validateUploadedFileMagicBytes, validate(manualLeadSchema), leadController.processNewManualLead);
router.put('/queue/toggle-status', authMiddleware, validate(toggleStatusSchema), leadController.toggleAgentAvailability);
router.get('/history', authMiddleware, leadController.getLeadHistory);

// ─── Leads CRM (entidade Lead dedicada) ───────────────────────────────────
router.get('/leads', authMiddleware, authorizeAnyPermission(['crm:leads:read', 'ADM', 'Administrador']), leadCrmController.list);
router.get('/leads/:id', authMiddleware, authorizeAnyPermission(['crm:leads:read', 'ADM', 'Administrador']), leadCrmController.getById);
router.get('/leads/:id/history', authMiddleware, authorizeAnyPermission(['crm:leads:read', 'ADM', 'Administrador']), leadCrmController.getLeadHistory);
router.post('/leads', authMiddleware, authorizeAnyPermission(['crm:leads:create', 'ADM', 'Administrador']), validate(createLeadSchema), leadCrmController.create);
router.put('/leads/:id', authMiddleware, authorizeAnyPermission(['crm:leads:update', 'ADM', 'Administrador']), validate(updateLeadSchema), leadCrmController.update);
router.put('/leads/:id/status', authMiddleware, authorizeAnyPermission(['crm:leads:update', 'ADM', 'Administrador']), validate(transitionStatusSchema), leadCrmController.transitionStatus);
router.put('/leads/:id/temperatura', authMiddleware, authorizeAnyPermission(['crm:leads:update', 'ADM', 'Administrador']), validate(temperaturaSchema), leadCrmController.setTemperatura);
router.put('/leads/:id/cancel', authMiddleware, authorizeAnyPermission(['crm:leads:update', 'ADM', 'Administrador']), validate(cancelLeadSchema), leadCrmController.cancelLead);
router.put('/leads/:id/reactivate', authMiddleware, authorizeAnyPermission(['crm:leads:reactivate', 'ADM', 'Administrador']), validate(reactivateLeadSchema), leadCrmController.reactivateLead);
router.delete('/leads/:id', authMiddleware, authorizeAnyPermission(['crm:leads:delete', 'ADM', 'Administrador']), leadCrmController.remove);
router.put('/leads-transfer', authMiddleware, authorizeAnyPermission(['crm:leads:update', 'ADM', 'Administrador']), validate(transferLeadsSchema), leadCrmController.transfer);
router.put('/leads-etapa', authMiddleware, authorizeAnyPermission(['crm:leads:update', 'ADM', 'Administrador']), validate(updateEtapaSchema), leadCrmController.updateEtapa);

// Conta/Pessoa — somente leitura (criação embutida no fluxo do Lead)
router.get('/accounts', authMiddleware, authorizeAnyPermission(['crm:accounts:read', 'ADM', 'Administrador']), accountController.list);
router.get('/accounts/:id', authMiddleware, authorizeAnyPermission(['crm:accounts:read', 'ADM', 'Administrador']), accountController.getById);

export default router;
