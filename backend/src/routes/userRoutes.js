import { Router } from "express";
import { createUserByAdminOrHR, listUsers, updateUser, deleteUser } from "../controllers/userController.js";
import { authMiddleware } from '../config/authMiddleware.js';
import { authorizePermission } from '../config/roleMiddleware.js';

const router = Router();

router.post('/create', authMiddleware, authorizePermission('rh:usuarios:create'), createUserByAdminOrHR);

// Qualquer um autenticado pode listar (usado nos selects do frontend)
router.get('/', authMiddleware, listUsers);

// Editar e excluir usuários requer privilégios correspondentes
router.put('/:id', authMiddleware, authorizePermission('rh:usuarios:update'), updateUser);
router.delete('/:id', authMiddleware, authorizePermission('rh:usuarios:delete'), deleteUser);

export default router;
