import { Router } from 'express';
import { authMiddleware } from '../config/authMiddleware.js';
import { authorizePermission, authorizeAnyPermission } from '../config/roleMiddleware.js';
import {
  listEquipes,
  getEquipe,
  createEquipe,
  updateEquipe,
  deleteEquipe,
} from '../controllers/equipeController.js';

const router = Router();

// Todos precisam estar autenticados
router.use(authMiddleware);

// Listar e buscar equipes
router.get('/', authorizeAnyPermission(['rh:equipes:read', 'rh:equipes:manage']), listEquipes);
router.get('/:id', authorizeAnyPermission(['rh:equipes:read', 'rh:equipes:manage']), getEquipe);

// CRUD — apenas quem gerencia equipes
router.post('/', authorizePermission('rh:equipes:manage'), createEquipe);
router.put('/:id', authorizePermission('rh:equipes:manage'), updateEquipe);
router.delete('/:id', authorizePermission('rh:equipes:manage'), deleteEquipe);

export default router;
