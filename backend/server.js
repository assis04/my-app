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
import { env } from "./src/config/env.js";
import { errorHandler } from "./src/middlewares/errorHandler.js";
import { initSocket } from './src/config/socket.js';

const app = express();
app.set('trust proxy', 1);

// Middlewares de Segurança
app.use(helmet());
// CORS: aceita origens do .env (CORS_ORIGIN, separadas por vírgula)
const allowedOrigins = env.CORS_ORIGIN.split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Requests sem origin (ex: curl, mobile apps) — permitir
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Bloqueado pelo CORS'));
  },
  credentials: true
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

// Tratamento Global de Erros (Middleware)
app.use(errorHandler);

const serverApp = http.createServer(app);

// Inicializa o Socket.IO passando o server nativo
initSocket(serverApp);

const PORT = env.PORT || 3001;
serverApp.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} with WebSocket Support 🚀`);
});