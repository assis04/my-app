import Redis from 'ioredis';
import { env } from './env.js';

const redis = new Redis({
  host: env.REDIS_HOST || 'redis',
  port: parseInt(env.REDIS_PORT || '6379', 10),
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 5) return null;
    return Math.min(times * 200, 2000);
  },
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

export default redis;
