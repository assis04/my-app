import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.POSTGRE_HOST,
  port: process.env.POSTGRE_PORT,
  user: process.env.POSTGRE_USERNAME,
  password: process.env.POSTGRE_PASSWORD,
  database: process.env.POSTGRE_DATABASE,
});

export default pool;