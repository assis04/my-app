import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { validate } from '../config/validateMiddleware.js';

// Bug-regression: Zod 4 expõe `issues` em vez de `errors` no ZodError.
// Antes desse fix, o middleware lançava TypeError ao tentar acessar
// `result.error.errors[0]` em qualquer payload inválido (500 disfarçado de 400).

const sampleSchema = z.object({
  nome: z.string().min(2, 'Nome muito curto.'),
  password: z.string().min(8, 'Senha muito curta.'),
});

function makeReqRes(body) {
  const req = { body };
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
  const next = vi.fn();
  return { req, res, next };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('validate middleware — Zod 4 issues', () => {
  it('passa adiante quando payload é válido', () => {
    const { req, res, next } = makeReqRes({ nome: 'Joao', password: 'segura12345' });
    validate(sampleSchema)(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(200);
  });

  it('retorna 400 (não 500) quando payload é inválido — sem TypeError', () => {
    const { req, res, next } = makeReqRes({ nome: 'X', password: '123' });
    expect(() => validate(sampleSchema)(req, res, next)).not.toThrow();
    expect(res.statusCode).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('inclui mensagem do primeiro erro no campo `message`', () => {
    const { req, res, next } = makeReqRes({ nome: 'X', password: '123' });
    validate(sampleSchema)(req, res, next);
    expect(res.body.message).toMatch(/Nome muito curto|Senha muito curta/);
  });

  it('inclui array `errors` com field + message de cada issue', () => {
    const { req, res, next } = makeReqRes({ nome: 'X', password: '123' });
    validate(sampleSchema)(req, res, next);
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors).toHaveLength(2);
    expect(res.body.errors[0]).toHaveProperty('field');
    expect(res.body.errors[0]).toHaveProperty('message');
  });

  it('lida com error.path como array vazia (validação no objeto raiz)', () => {
    // refine() no objeto raiz gera issue com path: []
    const refinedSchema = z.object({}).refine(() => false, { message: 'Sempre falha.' });
    const { req, res, next } = makeReqRes({});
    validate(refinedSchema)(req, res, next);
    expect(res.statusCode).toBe(400);
    expect(res.body.errors[0].field).toBe('');
    expect(res.body.errors[0].message).toBe('Sempre falha.');
  });

  it('sobrescreve req[source] com data parseada (preprocess/transform)', () => {
    const transformSchema = z.object({
      id: z.preprocess((v) => Number(v), z.number()),
    });
    const { req, res, next } = makeReqRes({ id: '42' });
    validate(transformSchema)(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.body.id).toBe(42); // string virou number
  });

  it('aceita source customizado (query)', () => {
    const querySchema = z.object({ page: z.preprocess((v) => Number(v), z.number()) });
    const req = { query: { page: '3' } };
    const res = { status() { return this; }, json() { return this; } };
    const next = vi.fn();
    validate(querySchema, 'query')(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.query.page).toBe(3);
  });
});