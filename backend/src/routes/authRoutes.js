import { Router } from "express";
import { AuthController } from "../controllers/authController.js";
import { authMiddleware } from '../config/authMiddleware.js';


const router = Router();

router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);

router.get('/me', authMiddleware, AuthController.me);

export default router;