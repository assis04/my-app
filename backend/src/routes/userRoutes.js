import { Router } from "express";
import { createUserByAdminOrHR, listUsers, lookupUsers, updateUser, deleteUser } from "../controllers/userController.js";
import { authMiddleware } from '../config/authMiddleware.js';
import { authorizePermission } from '../config/roleMiddleware.js';
import { validate } from '../config/validateMiddleware.js';
import { createUserSchema, updateUserSchema } from '../validators/userValidator.js';

const router = Router();

router.post('/create', authMiddleware, authorizePermission('rh:usuarios:create'), validate(createUserSchema), createUserByAdminOrHR);

// Lookup leve para selects: qualquer autenticado, payload mínimo (id, nome, perfil, filialId, ativo).
// Filtros opcionais: ?filialId= e ?role= reduzem escopo e payload.
router.get('/lookup', authMiddleware, lookupUsers);

// Listagem completa (email, timestamps, etc.) restrita a quem gerencia usuários.
router.get('/', authMiddleware, authorizePermission('rh:usuarios:read'), listUsers);

// Editar e excluir usuários requer privilégios correspondentes
router.put('/:id', authMiddleware, authorizePermission('rh:usuarios:update'), validate(updateUserSchema), updateUser);
router.delete('/:id', authMiddleware, authorizePermission('rh:usuarios:delete'), deleteUser);

export default router;
