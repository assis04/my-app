import { createHash } from 'crypto';
import redis from '../config/redis.js';

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Blacklist an access token. TTL = remaining time until expiry.
 */
export async function blacklistAccessToken(token, decodedPayload) {
  const hash = hashToken(token);
  const ttl = decodedPayload.exp - Math.floor(Date.now() / 1000);
  if (ttl > 0) {
    await redis.set(`bl:${hash}`, '1', 'EX', ttl);
  }
}

/**
 * Check if an access token is blacklisted.
 */
export async function isTokenBlacklisted(token) {
  const hash = hashToken(token);
  const result = await redis.get(`bl:${hash}`);
  return result !== null;
}

/**
 * Store the current valid refresh token hash for a user.
 * Only the latest refresh token is valid (rotation).
 */
export async function storeRefreshToken(userId, token) {
  const hash = hashToken(token);
  await redis.set(`rt:${userId}`, hash, 'EX', 7 * 24 * 60 * 60);
}

/**
 * Validate that the refresh token matches the stored one.
 */
export async function isRefreshTokenValid(userId, token) {
  const hash = hashToken(token);
  const stored = await redis.get(`rt:${userId}`);
  return stored === hash;
}

/**
 * Revoke a user's refresh token (on logout).
 */
export async function revokeRefreshToken(userId) {
  await redis.del(`rt:${userId}`);
}
