import { Router } from "express";
import { TaskController } from "../controllers/taskController.js";
import { authMiddleware } from "../config/authMiddleware.js";

const router = Router();

// Todas as rotas de tarefas exigem autenticação
import { validate } from '../config/validateMiddleware.js';
import { createTaskSchema, updateTaskSchema, updateTaskStatusSchema } from '../validators/taskValidator.js';

router.use(authMiddleware);

router.get("/", TaskController.getTasks);
router.post("/", validate(createTaskSchema), TaskController.createTask);
router.put("/:id/status", validate(updateTaskStatusSchema), TaskController.updateTaskStatus);
router.put("/:id", validate(updateTaskSchema), TaskController.updateTask);
router.delete("/:id", TaskController.deleteTask);

export default router;
