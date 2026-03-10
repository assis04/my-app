import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import authRoutes from "./src/routes/authRoutes.js";
import roleRoutes from "./src/routes/roleRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import filialRoutes from "./src/routes/filialRoutes.js";
import equipeRoutes from "./src/routes/equipeRoutes.js";
import captacaoRoutes from "./src/routes/captacaoRoutes.js";
import { env } from "./src/config/env.js";
import { errorHandler } from "./src/middlewares/errorHandler.js";

const app = express();

// Middlewares de Segurança
app.use(helmet());
// Configuração flexível de CORS para suportar localhost, 127.0.0.1, e múltiplas portas
// Configuração flexível de CORS para suportar localhost e acessos por IP na rede local (Ex: 192.168.x.x)
app.use(cors({ 
  origin: true, // Permite qualquer origem dinamicamente (reflete a origem de quem chamou)
  credentials: true 
}));
app.use(express.json());
app.use(cookieParser());

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
app.use('/api/captacao', captacaoRoutes); // Nova rota de Captação Fila inteligente

// Tratamento Global de Erros (Middleware)
app.use(errorHandler);

import http from 'http';
import { initSocket } from './src/config/socket.js';

const serverApp = http.createServer(app);

// Inicializa o Socket.IO passando o server nativo
initSocket(serverApp);

const PORT = env.PORT || 3001;
serverApp.listen(PORT, () => {
  console.log(`Server running on port ${PORT} with WebSocket Support 🚀`);
});