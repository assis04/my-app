import { Router } from "express";
import pool from "../config/dbConnect.js";
import { authMiddleware } from "../config/authMiddleware.js";
import { authorizeRoles } from "../config/roleMiddleware.js";

const router = Router();

// Middleware: Só 'admin' ou 'rh' podem mexer aqui
router.use(authMiddleware, authorizeRoles('admin', 'rh'));

// Criar um novo Role
router.post('/', async (req, res) => {
  const { nome, descricao } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO roles (nome, descricao) VALUES ($1, $2) RETURNING *",
      [nome.toLowerCase(), descricao]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Erro ao criar role. Nome já existe?" });
  }
});

// Listar todos os Roles (para aparecer no select do Frontend)
router.get('/', async (req, res) => {
  const result = await pool.query("SELECT * FROM roles ORDER BY id ASC");
  res.json(result.rows);
});

export default router;