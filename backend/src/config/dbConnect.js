import pkg from 'pg';
import { env } from './env.js';
const { Pool } = pkg;

const pool = new Pool({
  host: env.POSTGRE_HOST,
  port: env.POSTGRE_PORT,
  user: env.POSTGRE_USERNAME,
  password: env.POSTGRE_PASSWORD,
  database: env.POSTGRE_DATABASE,
});

export default pool;