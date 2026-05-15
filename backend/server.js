import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import http from 'http';
import authRoutes from "./src/routes/authRoutes.js";
import roleRoutes from "./src/routes/roleRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import filialRoutes from "./src/routes/filialRoutes.js";
import equipeRoutes from "./src/routes/equipeRoutes.js";
import crmRoutes from "./src/routes/crmRoutes.js";
import taskRoutes from "./src/routes/taskRoutes.js";
import docsRoutes from "./src/routes/docsRoutes.js";
import publicRoutes from "./src/routes/publicRoutes.js";
import apiKeyRoutes from "./src/routes/apiKeyRoutes.js";
import { env } from "./src/config/env.js";
import { errorHandler } from "./src/middlewares/errorHandler.js";
import { initSocket } from './src/config/socket.js';
import { start as startOutboxWorker, stop as stopOutboxWorker } from './src/workers/outboxWorker.js';

const app = express();
app.set('trust proxy', 1);

// Middlewares de Segurança
app.use(helmet());
// CORS: aceita origens do .env (CORS_ORIGIN, separadas por vírgula).
// Rotas /api/public/* recebem CORS permissivo (sem credentials) porque
// autenticam via header X-Api-Key e a restrição por origem é aplicada
// no apiKeyMiddleware contra a allowlist da própria chave — não dá pra
// resolver no preflight (X-Api-Key não é enviado em OPTIONS).
const allowedOrigins = env.CORS_ORIGIN.split(',').map(o => o.trim()).filter(Boolean);

app.use(cors((req, callback) => {
  if (req.path.startsWith('/api/public/')) {
    return callback(null, { origin: true, credentials: false });
  }
  return callback(null, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error('Bloqueado pelo CORS'));
    },
    credentials: true,
  });
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Uploads são servidos via endpoints dedicados (ex: GET /api/crm/leads/:id/planta)
// para enforce de filial isolation — não há mais express.static em /uploads.

// Rate Limiting Global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
});
app.use(limiter);

// Rotas
app.use("/auth", authRoutes); // Usa o prefixo /auth para organizar
app.use("/roles", roleRoutes);
app.use("/users", userRoutes);
app.use('/filiais', filialRoutes);
app.use('/equipes', equipeRoutes);
app.use('/api/crm', crmRoutes); // Módulo de CRM (inclui fila da vez, leads, orçamentos)
app.use('/api/tasks', taskRoutes); // Módulo de Tarefas
app.use('/api', docsRoutes); // Documentação OpenAPI (admin-only): /api/docs e /api/docs.json
app.use('/api/public', publicRoutes); // Intake externo (landing pages) via X-Api-Key
app.use('/api/admin/api-keys', apiKeyRoutes); // Gestão de API keys (admin-only)

// Tratamento Global de Erros (Middleware)
app.use(errorHandler);

const serverApp = http.createServer(app);

// Inicializa o Socket.IO passando o server nativo
initSocket(serverApp);

const PORT = env.PORT || 3001;
serverApp.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} with WebSocket Support 🚀`);
  // Outbox worker — consome eventos enfileirados por leadTransitionService etc.
  // Embarcado no mesmo processo (não há infraestrutura de worker dedicado).
  startOutboxWorker();
});

// Graceful shutdown — para o worker primeiro, depois fecha HTTP, depois exit.
// Isso garante que ticks em curso terminem e a tabela Outbox não fica em estado
// inconsistente quando o container recebe SIGTERM (deploy / restart).
function gracefulShutdown(signal) {
  console.log(`[server] ${signal} recebido, parando outbox worker...`);
  stopOutboxWorker();
  serverApp.close((err) => {
    if (err) {
      console.error('[server] erro ao fechar HTTP:', err);
      process.exit(1);
    }
    console.log('[server] HTTP fechado, saindo.');
    process.exit(0);
  });
  // Fallback se HTTP não fechar em 10s (conexões keep-alive penduradas)
  setTimeout(() => {
    console.error('[server] timeout no shutdown, forçando exit.');
    process.exit(1);
  }, 10000).unref();
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));