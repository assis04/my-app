import { describe, it, expect, vi, beforeEach } from 'vitest';

// Testes do wrapper leadService — foco em: (1) withQueueLock ser aplicado
// com branchId correto, (2) validação de telefone antes do lock, (3)
// delegação correta para createLead (fluxo canônico unificado — Task #21).
// Não re-testamos a lógica interna do createLead aqui.

const mockWithQueueLock = vi.fn();
const mockCreateLead = vi.fn();

vi.mock('../utils/redisLock.js', () => ({
  withQueueLock: mockWithQueueLock,
}));

vi.mock('../services/leadCrmService.js', () => ({
  createLead: mockCreateLead,
}));

vi.mock('../config/prisma.js', () => ({
  default: {
    $queryRaw: vi.fn().mockResolvedValue([]),
    salesQueue: { upsert: vi.fn() },
    lead: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

const { assignLeadQuick, assignLeadManual } = await import('../services/leadService.js');

beforeEach(() => {
  vi.clearAllMocks();
  // Lock adquirido e fn é executada
  mockWithQueueLock.mockImplementation(async (_branchId, fn) => fn());
  // createLead retorna um Lead "criado" com campos usados pelo wrapper
  mockCreateLead.mockResolvedValue({
    id: 999,
    contaId: 100,
    vendedorId: 7,
    vendedor: { id: 7, nome: 'Vendedor Teste' },
  });
});

describe('assignLeadQuick — lock da fila', () => {
  it('chama withQueueLock com branchId correto', async () => {
    await assignLeadQuick(3, { telefone: '11999999999', nome: 'X', cep: '01000000' });
    expect(mockWithQueueLock).toHaveBeenCalledTimes(1);
    expect(mockWithQueueLock).toHaveBeenCalledWith(3, expect.any(Function));
  });

  it('normaliza branchId string → int antes de passar ao lock', async () => {
    await assignLeadQuick('3', { telefone: '11999999999', nome: 'X', cep: '01000000' });
    expect(mockWithQueueLock).toHaveBeenCalledWith(3, expect.any(Function));
  });

  it('rejeita branchId inválido ANTES de tentar adquirir lock', async () => {
    await expect(
      assignLeadQuick('abc', { telefone: '11999999999' }),
    ).rejects.toThrow(/filial inválido/);
    expect(mockWithQueueLock).not.toHaveBeenCalled();
    expect(mockCreateLead).not.toHaveBeenCalled();
  });

  it('delega para createLead com assignmentStrategy="queue" e filialId', async () => {
    await assignLeadQuick(3, { telefone: '11999999999', nome: 'X', cep: '01000000' });
    expect(mockCreateLead).toHaveBeenCalledTimes(1);
    const [data, user, opts] = mockCreateLead.mock.calls[0];
    expect(opts).toEqual({ assignmentStrategy: 'queue', filialId: 3 });
    expect(data.celular).toBe('11999999999'); // mapped from telefone
    expect(data.nome).toBe('X');
    expect(data.cep).toBe('01000000');
    expect(user).toBeNull(); // nenhum user passado explicitamente
  });

  it('encaminha o objeto user quando fornecido', async () => {
    const user = { id: 42, role: 'Captacao' };
    await assignLeadQuick(3, { telefone: '11999999999', nome: 'X', cep: '01000000' }, user);
    expect(mockCreateLead).toHaveBeenCalledWith(expect.any(Object), user, expect.any(Object));
  });

  it('retorna shape { leadId, accountId, assignedUserId, vendedorNome }', async () => {
    const r = await assignLeadQuick(3, { telefone: '11999999999', nome: 'X', cep: '01000000' });
    expect(r).toEqual({
      leadId: 999,
      accountId: 100,
      assignedUserId: 7,
      vendedorNome: 'Vendedor Teste',
    });
  });

  it('propaga 409 quando lock está ocupado — createLead não é chamado', async () => {
    const conflict = new Error('Recurso em uso, tente novamente.');
    conflict.statusCode = 409;
    mockWithQueueLock.mockRejectedValueOnce(conflict);

    await expect(
      assignLeadQuick(3, { telefone: '11999999999', nome: 'X', cep: '01000000' }),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(mockCreateLead).not.toHaveBeenCalled();
  });
});

describe('assignLeadQuick — validação de telefone', () => {
  it('ainda rejeita telefone mal formatado (menos de 10 dígitos)', async () => {
    await expect(
      assignLeadQuick(3, { telefone: '123', nome: 'X', cep: '01000000' }),
    ).rejects.toThrow(/10 e 11 dígitos/);
    expect(mockWithQueueLock).not.toHaveBeenCalled();
  });

  it('ainda rejeita telefone ausente', async () => {
    await expect(
      assignLeadQuick(3, { nome: 'X', cep: '01000000' }),
    ).rejects.toThrow(/obrigatório/);
    expect(mockWithQueueLock).not.toHaveBeenCalled();
  });

  it('celular duplicado NÃO bloqueia (Task #19) — createLead é chamado normalmente', async () => {
    // O teste de verdade está em queueAssignmentService / leadCrmService —
    // aqui validamos apenas que o wrapper não adiciona nenhum check extra.
    await assignLeadQuick(3, {
      telefone: '11999999999',
      nome: 'Mesma pessoa',
      cep: '01000000',
    });
    expect(mockCreateLead).toHaveBeenCalled();
  });
});

describe('assignLeadManual — lock + delegação', () => {
  it('chama withQueueLock com branchId correto', async () => {
    await assignLeadManual(3, { telefone: '11999999999', nome: 'X', cep: '01000000' }, 7);
    expect(mockWithQueueLock).toHaveBeenCalledWith(3, expect.any(Function));
  });

  it('rejeita IDs inválidos ANTES do lock', async () => {
    await expect(
      assignLeadManual('abc', { telefone: '11999999999' }, 7),
    ).rejects.toThrow(/inválidos/);
    await expect(
      assignLeadManual(3, { telefone: '11999999999' }, 'xyz'),
    ).rejects.toThrow(/inválidos/);
    expect(mockWithQueueLock).not.toHaveBeenCalled();
  });

  it('delega para createLead com assignmentStrategy="manual" + assignedUserId', async () => {
    await assignLeadManual(3, { telefone: '11999999999', nome: 'X', cep: '01000000' }, 7);
    expect(mockCreateLead).toHaveBeenCalledWith(
      expect.objectContaining({ celular: '11999999999' }),
      null,
      { assignmentStrategy: 'manual', filialId: 3, assignedUserId: 7 },
    );
  });

  it('encaminha user quando fornecido', async () => {
    const user = { id: 42, role: 'Gerente' };
    await assignLeadManual(3, { telefone: '11999999999', nome: 'X', cep: '01000000' }, 7, user);
    expect(mockCreateLead).toHaveBeenCalledWith(expect.any(Object), user, expect.any(Object));
  });

  it('propaga 409 quando lock está ocupado', async () => {
    const conflict = new Error('ocupado');
    conflict.statusCode = 409;
    mockWithQueueLock.mockRejectedValueOnce(conflict);

    await expect(
      assignLeadManual(3, { telefone: '11999999999', nome: 'X', cep: '01000000' }, 7),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(mockCreateLead).not.toHaveBeenCalled();
  });
});

describe('assignLead* — filiais distintas → locks independentes', () => {
  it('atribuições em filiais diferentes adquirem locks diferentes', async () => {
    await assignLeadQuick(3, { telefone: '11999999999', nome: 'A', cep: '01000000' });
    await assignLeadQuick(5, { telefone: '11888888888', nome: 'B', cep: '02000000' });

    const branches = mockWithQueueLock.mock.calls.map((c) => c[0]);
    expect(branches).toEqual([3, 5]);
  });
});
