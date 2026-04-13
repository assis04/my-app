import { Router } from "express";
import rateLimit from "express-rate-limit";
import { AuthController } from "../controllers/authController.js";
import { authMiddleware } from '../config/authMiddleware.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
});

const refreshLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas tentativas de refresh. Tente novamente em 1 minuto.' },
});

router.post('/login', loginLimiter, AuthController.login);
router.post('/refresh', refreshLimiter, AuthController.refresh);
router.post('/logout', AuthController.logout);

router.get('/me', authMiddleware, AuthController.me);
router.post('/change-password', authMiddleware, AuthController.forceChangePassword);

export default router;