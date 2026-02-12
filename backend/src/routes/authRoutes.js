import { Router } from "express";
import { AuthController } from "../controllers/authController.js";
import { authMiddleware } from '../config/authMiddleware.js';
import { authorizeRoles } from '../config/roleMiddleware.js';

const router = Router();

router.post('/login', AuthController.login);
router.post('/register', AuthController.register);

// rota protegida exemplo
router.get('/me', authMiddleware, (req, res) => {
  res.json(req.user);
});

export default router;