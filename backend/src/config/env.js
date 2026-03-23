import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform(Number).default('3001'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  POSTGRE_HOST: z.string().min(1, 'POSTGRE_HOST is required'),
  POSTGRE_PORT: z.string().transform(Number).default('5432'),
  POSTGRE_USERNAME: z.string().min(1, 'POSTGRE_USERNAME is required'),
  POSTGRE_PASSWORD: z.string().min(1, 'POSTGRE_PASSWORD is required'),
  POSTGRE_DATABASE: z.string().min(1, 'POSTGRE_DATABASE is required'),
  CORS_ORIGIN: z.string().optional().default('http://localhost:3000'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:', _env.error.format());
  process.exit(1);
}

export const env = _env.data;
