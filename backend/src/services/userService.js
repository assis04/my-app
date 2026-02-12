import pool from '../config/dbConnect.js';

export async function findUserByEmail(email) {
  // JOIN para trazer o nome do role junto com o user
  const query = `
    SELECT u.id, u.nome, u.email, u.password, u.role_id, r.nome as role_nome
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.email = $1
  `;
  const result = await pool.query(query, [email]);
  return result.rows[0];
}

export async function createUser(nome, email, password, roleId) {
  const defaultRoleId = roleId || null; 

  const result = await pool.query(
    `
    INSERT INTO users (nome, email, password, role_id)
    VALUES ($1, $2, $3, $4)
    RETURNING id, nome, email, role_id
    `,
    [nome, email, password, defaultRoleId]
  );
  return result.rows[0];
}