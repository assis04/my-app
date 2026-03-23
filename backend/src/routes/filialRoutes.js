import { Router } from 'express';
import { authMiddleware } from '../config/authMiddleware.js';
import { authorizeRoles } from '../config/roleMiddleware.js';
import {
  listFiliais,
  getFilial,
  createFilial,
  updateFilial,
  deleteFilial,
} from '../controllers/filialController.js';

const router = Router();

// Todos autenticados podem ver a lista de filiais (usada em selects)
router.get('/', authMiddleware, listFiliais);
router.get('/:id', authMiddleware, getFilial);

// Apenas ADM pode criar, editar e remover
router.post('/', authMiddleware, authorizeRoles('ADM', 'admin', 'Administrador'), createFilial);
router.put('/:id', authMiddleware, authorizeRoles('ADM', 'admin', 'Administrador'), updateFilial);
router.delete('/:id', authMiddleware, authorizeRoles('ADM', 'admin', 'Administrador'), deleteFilial);

export default router;
