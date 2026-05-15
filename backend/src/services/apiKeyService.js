/**
 * apiKeyService — geração, validação e gestão de API keys para origens externas.
 *
 * Fluxo de criação:
 *   1. Admin chama `createApiKey({ name, filialId?, source?, expiresAt? }, user)`
 *   2. Service gera token aleatório com prefixo `vlc_live_` + 32 chars hex
 *   3. Armazena: prefix (primeiros 12 chars, público) + bcrypt(plain) (privado)
 *   4. Retorna ÚNICA VEZ a chave em plain pro caller mostrar pro admin
 *
 * Fluxo de validação:
 *   1. Request chega com header X-Api-Key
 *   2. `validateApiKey(plain)` extrai prefix, busca registro ativo
 *   3. bcrypt.compare(plain, hash) — true = válida
 *   4. Atualiza lastUsedAt (best-effort, async)
 *
 * Segurança:
 *  - Plain key NUNCA persiste (só o bcrypt hash)
 *  - Prefix público facilita identificação humana sem expor o secret
 *  - Constant-time comparison via bcrypt (resistente a timing attacks)
 *
 * Spec: specs/api-public.md
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../config/prisma.js';
import AppError from '../utils/AppError.js';

const KEY_PREFIX_LENGTH = 12; // 'vlc_live_abc'
const KEY_SECRET_BYTES = 24; // 48 chars hex após o prefix

/**
 * Gera uma nova API key e persiste no DB. A chave plain é retornada
 * ÚNICA VEZ — não é possível recuperar depois.
 *
 * @returns {Promise<{ id, prefix, plainKey, ...metadados }>}
 */
export async function createApiKey(
  { name, filialId, source, expiresAt, allowedOrigins },
  user,
) {
  if (!name || name.trim().length < 3) {
    throw new AppError('Nome da chave é obrigatório (mín. 3 caracteres).', 400);
  }
  if (!user?.id) {
    throw new AppError('Usuário autenticado é obrigatório.', 401);
  }

  // Gera secret aleatório criptograficamente seguro.
  const random = crypto.randomBytes(KEY_SECRET_BYTES).toString('hex');
  const plainKey = `vlc_live_${random}`;
  const prefix = plainKey.slice(0, KEY_PREFIX_LENGTH);
  const hash = await bcrypt.hash(plainKey, 10);

  const apiKey = await prisma.apiKey.create({
    data: {
      name: name.trim(),
      prefix,
      hash,
      filialId: filialId ? parseInt(filialId, 10) : null,
      source: source?.trim() || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      allowedOrigins: Array.isArray(allowedOrigins)
        ? allowedOrigins.map((u) => u.trim()).filter(Boolean)
        : [],
      createdById: user.id,
    },
    select: publicSelect(),
  });

  // Plain key retornada SOMENTE no momento da criação.
  return { ...apiKey, plainKey };
}

/**
 * Valida uma chave plain contra os registros ativos no DB.
 * Retorna o registro completo (sem hash) se válida, null se não.
 *
 * @param {string} plainKey — header X-Api-Key recebido
 * @returns {Promise<ApiKeyRecord | null>}
 */
export async function validateApiKey(plainKey) {
  if (typeof plainKey !== 'string' || !plainKey.startsWith('vlc_live_')) {
    return null;
  }
  const prefix = plainKey.slice(0, KEY_PREFIX_LENGTH);
  if (prefix.length !== KEY_PREFIX_LENGTH) return null;

  const record = await prisma.apiKey.findFirst({
    where: {
      prefix,
      active: true,
      revokedAt: null,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    include: {
      filial: { select: { id: true, nome: true } },
    },
  });

  if (!record) return null;

  const match = await bcrypt.compare(plainKey, record.hash);
  if (!match) return null;

  // Best-effort: atualiza lastUsedAt sem bloquear a request.
  prisma.apiKey
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch(() => { /* não bloqueia request por falha de update */ });

  // Remove hash do retorno por segurança.
  const { hash, ...safe } = record;
  return safe;
}

export async function listApiKeys() {
  return prisma.apiKey.findMany({
    orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
    select: publicSelect(),
  });
}

export async function revokeApiKey(id, user) {
  if (!user?.id) throw new AppError('Usuário autenticado é obrigatório.', 401);

  const existing = await prisma.apiKey.findUnique({ where: { id: parseInt(id, 10) } });
  if (!existing) throw new AppError('Chave não encontrada.', 404);
  if (existing.revokedAt) throw new AppError('Chave já está revogada.', 400);

  return prisma.apiKey.update({
    where: { id: existing.id },
    data: {
      active: false,
      revokedAt: new Date(),
    },
    select: publicSelect(),
  });
}

/**
 * Select público — nunca inclui hash. Reusado em todas as queries.
 */
function publicSelect() {
  return {
    id: true,
    name: true,
    prefix: true,
    source: true,
    allowedOrigins: true,
    active: true,
    revokedAt: true,
    expiresAt: true,
    lastUsedAt: true,
    createdAt: true,
    updatedAt: true,
    filialId: true,
    filial: { select: { id: true, nome: true } },
    createdById: true,
    createdBy: { select: { id: true, nome: true } },
  };
}
