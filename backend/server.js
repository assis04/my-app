import 'dotenv/config';
import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import authRoutes from "./src/routes/authRoutes.js"; 
import roleRoutes from "./src/routes/roleRoutes.js";


// Validação de variáveis de ambiente (Fail Fast)
if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET não definido.");
  process.exit(1);
}

const app = express();

// Middlewares de Segurança
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:3000" }));
app.use(express.json());


// Rate Limiting Global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
});
app.use(limiter);

// Rotas
app.use("/auth", authRoutes); // Usa o prefixo /auth para organizar

app.use("/roles", roleRoutes);

// Tratamento Global de Erros (ver ponto 4)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Ocorreu um erro interno no servidor.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});