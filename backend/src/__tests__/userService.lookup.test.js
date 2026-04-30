import { describe, it, expect, vi, beforeEach } from 'vitest';

// Testa listUsersForLookup — endpoint leve para popular selects no frontend.
// Garante que (1) só campos não-sensíveis vazam (sem email),
// (2) filtros server-side funcionam (filialId, role),
// (3) o limite duro de 500 é aplicado.

const mockPrisma = {
  user: {
    findMany: vi.fn(),
  },
};

vi.mock('../config/prisma.js', () => ({ default: mockPrisma }));

const { listUsersForLookup } = await import('../services/userService.js');

const SAMPLE_USERS = [
  { id: 1, nome: 'Alice', ativo: true, filialId: 10, role: { nome: 'Vendedor' } },
  { id: 2, nome: 'Bob', ativo: false, filialId: 10, role: { nome: 'Gerente' } },
  { id: 3, nome: 'Carol', ativo: true, filialId: null, role: null },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.user.findMany.mockResolvedValue(SAMPLE_USERS);
});

describe('listUsersForLookup', () => {
  it('retorna apenas campos seguros (sem email/timestamps)', async () => {
    const result = await listUsersForLookup();
    expect(result).toEqual([
      { id: 1, nome: 'Alice', ativo: true, filialId: 10, perfil: 'Vendedor' },
      { id: 2, nome: 'Bob', ativo: false, filialId: 10, perfil: 'Gerente' },
      { id: 3, nome: 'Carol', ativo: true, filialId: null, perfil: null },
    ]);
    // Nenhum campo "email", "password", "createdAt" no payload
    for (const u of result) {
      expect(u.email).toBeUndefined();
      expect(u.password).toBeUndefined();
      expect(u.createdAt).toBeUndefined();
    }
  });

  it('passa where com deletedAt=null por default', async () => {
    await listUsersForLookup();
    const arg = mockPrisma.user.findMany.mock.calls[0][0];
    expect(arg.where).toMatchObject({ deletedAt: null });
    expect(arg.where.filialId).toBeUndefined();
    expect(arg.where.role).toBeUndefined();
  });

  it('aplica filtro filialId quando fornecido (string ou number)', async () => {
    await listUsersForLookup({ filialId: '7' });
    expect(mockPrisma.user.findMany.mock.calls[0][0].where.filialId).toBe(7);

    await listUsersForLookup({ filialId: 9 });
    expect(mockPrisma.user.findMany.mock.calls[1][0].where.filialId).toBe(9);
  });

  it('ignora filialId não-numérico', async () => {
    await listUsersForLookup({ filialId: 'abc' });
    expect(mockPrisma.user.findMany.mock.calls[0][0].where.filialId).toBeUndefined();
  });

  it('aplica filtro role como case-insensitive', async () => {
    await listUsersForLookup({ role: 'vendedor' });
    expect(mockPrisma.user.findMany.mock.calls[0][0].where.role).toEqual({
      nome: { equals: 'vendedor', mode: 'insensitive' },
    });
  });

  it('aplica os dois filtros simultaneamente', async () => {
    await listUsersForLookup({ filialId: 5, role: 'Gerente' });
    const where = mockPrisma.user.findMany.mock.calls[0][0].where;
    expect(where.filialId).toBe(5);
    expect(where.role).toEqual({ nome: { equals: 'Gerente', mode: 'insensitive' } });
  });

  it('aplica take=500 como limite duro', async () => {
    await listUsersForLookup();
    expect(mockPrisma.user.findMany.mock.calls[0][0].take).toBe(500);
  });

  it('seleciona apenas campos não-sensíveis no select do prisma', async () => {
    await listUsersForLookup();
    const arg = mockPrisma.user.findMany.mock.calls[0][0];
    expect(arg.select).toEqual({
      id: true,
      nome: true,
      ativo: true,
      filialId: true,
      role: { select: { nome: true } },
    });
    expect(arg.select.email).toBeUndefined();
    expect(arg.select.password).toBeUndefined();
  });
});
