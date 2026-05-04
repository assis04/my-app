import { Router } from "express";
import { authMiddleware } from "../config/authMiddleware.js";
import { authorizePermission } from "../config/roleMiddleware.js";
import { validate } from '../config/validateMiddleware.js';
import { createRoleSchema, updateRoleSchema } from '../validators/roleValidator.js';
import * as roleController from "../controllers/roleController.js";

const router = Router();

// Criar um novo Role
router.post('/', authMiddleware, authorizePermission('rh:perfis:create'), validate(createRoleSchema), roleController.createRole);

// Retornar os roles que o usuário logado pode atribuir
router.get('/assignable', authMiddleware, authorizePermission('rh:perfis:read'), roleController.getAssignableRoles);

// Listar todos os Roles
router.get('/', authMiddleware, authorizePermission('rh:perfis:read'), roleController.getAllRoles);

// Atualizar um Role existente
router.put('/:id', authMiddleware, authorizePermission('rh:perfis:update'), validate(updateRoleSchema), roleController.updateRole);

// Remover um Role
router.delete('/:id', authMiddleware, authorizePermission('rh:perfis:delete'), roleController.deleteRole);

export default router;
