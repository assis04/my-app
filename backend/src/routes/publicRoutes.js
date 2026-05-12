/**
 * publicRoutes — endpoints públicos (sem authMiddleware JWT).
 *
 * Autenticação por API key (header X-Api-Key) via apiKeyMiddleware.
 * Rate limit específico mais agressivo que o global: 10 req/min por IP.
 *
 * Spec: specs/api-public.md
 */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { apiKeyMiddleware } from '../config/apiKeyMiddleware.js';
import { validate } from '../config/validateMiddleware.js';
import { publicLeadSchema } from '../validators/publicLeadValidator.js';
import * as publicLeadController from '../controllers/publicLeadController.js';

const router = Router();

// Rate limit dedicado pra intake público — mais restritivo que o global.
// 10 requests por minuto por IP. Spam ou abuso → 429.
const publicIntakeLimiter = rateLimit({
  windowMs: 60_000, // 1 minuto
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Limite de requisições excedido. Tente novamente em 1 minuto.' },
});

// POST /api/public/leads — recebe lead de origem externa (landing page).
router.post(
  '/leads',
  publicIntakeLimiter,
  apiKeyMiddleware,
  validate(publicLeadSchema),
  publicLeadController.create,
);

export default router;
