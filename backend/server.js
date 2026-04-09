import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import http from 'http';
import { fileURLToPath } from 'url';
import path from 'path';
import authRoutes from "./src/routes/authRoutes.js";
import roleRoutes from "./src/routes/roleRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import filialRoutes from "./src/routes/filialRoutes.js";
import equipeRoutes from "./src/routes/equipeRoutes.js";
import crmRoutes from "./src/routes/crmRoutes.js";
import taskRoutes from "./src/routes/taskRoutes.js";
import { env } from "./src/config/env.js";
import { errorHandler } from "./src/middlewares/errorHandler.js";
import { initSocket } from './src/config/socket.js';
import { authMiddleware } from './src/config/authMiddleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Middlewares de Segurança
app.use(helmet());
// CORS: aceita origens do .env + qualquer IP de rede local automaticamente
const allowedOrigins = env.CORS_ORIGIN.split(',').map(origin => origin.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Requests sem origin (ex: curl, mobile apps) — permitir
    if (!origin) return callback(null, true);
    // Origens explícitas no .env
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Rede local: 192.168.x.x, 10.x.x.x, 172.16-31.x.x em qualquer porta
    if (/^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    callback(new Error('Bloqueado pelo CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Servir arquivos estáticos da pasta uploads (plantas, contratos, etc.)
// Protegido por autenticação — apenas usuários logados podem acessar
app.use('/uploads', authMiddleware, express.static(path.join(__dirname, 'uploads')));

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

// Tratamento Global de Erros (Middleware)
app.use(errorHandler);

const serverApp = http.createServer(app);

// Inicializa o Socket.IO passando o server nativo
initSocket(serverApp);

const PORT = env.PORT || 3001;
serverApp.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} with WebSocket Support 🚀`);
});