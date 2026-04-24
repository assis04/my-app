import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  lead: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock('../config/prisma.js', () => ({ default: mockPrisma }));
vi.mock('../services/accountService.js', () => ({
  findOrMatchAccount: vi.fn(),
}));

const { updateLead } = await import('../services/leadCrmService.js');
const { LeadStatus } = await import('../domain/leadStatus.js');

const regularUser = {
  id: 7,
  role: 'Vendedor',
  filialId: 1,
  permissions: ['crm:leads:update'],
};

const admUser = {
  id: 99,
  role: 'ADM',
  filialId: null,
  permissions: ['*', 'crm:leads:edit-after-sale'],
};

const leadBase = {
  id: 10,
  status: LeadStatus.EM_PROSPECCAO,
  filialId: 1,
  deletedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  // assertLeadAccess + updateLead fazem 2 findFirst — retornam o mesmo lead por default
  mockPrisma.lead.findFirst.mockResolvedValue(leadBase);
  mockPrisma.lead.update.mockImplementation(({ data }) => ({ ...leadBase, ...data }));
});

describe('updateLead — Guard 1: mutação de status/etapa via PUT genérico', () => {
  it('rejeita quando body contém status', async () => {
    await expect(
      updateLead(10, { nome: 'X', status: 'Venda' }, regularUser),
    ).rejects.toThrow(/PUT \/leads\/:id\/status/);
  });

  it('rejeita quando body contém etapa', async () => {
    await expect(
      updateLead(10, { nome: 'X', etapa: 'Negociação' }, regularUser),
    ).rejects.toThrow(/PUT \/leads\/:id\/status/);
  });

  it('rejeita também o alias legado etapaJornada', async () => {
    await expect(
      updateLead(10, { etapaJornada: 'Negociação' }, regularUser),
    ).rejects.toThrow(/PUT \/leads\/:id\/status/);
  });

  it('rejeita ANTES de tocar no DB (findFirst não é chamado)', async () => {
    try {
      await updateLead(10, { status: 'Venda' }, regularUser);
    } catch {}
    expect(mockPrisma.lead.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.lead.update).not.toHaveBeenCalled();
  });
});

describe('updateLead — Guard 2: campos gerenciados por endpoints dedicados', () => {
  it('rejeita temperatura (tem endpoint /temperatura dedicado)', async () => {
    await expect(
      updateLead(10, { temperatura: 'Muito interessado' }, regularUser),
    ).rejects.toThrow(/temperatura.*endpoint dedicado/);
  });

  it('rejeita statusAntesCancelamento (gerenciado pelo orquestrador)', async () => {
    await expect(
      updateLead(10, { statusAntesCancelamento: 'Em prospecção' }, regularUser),
    ).rejects.toThrow(/statusAntesCancelamento/);
  });

  it('rejeita canceladoEm', async () => {
    await expect(
      updateLead(10, { canceladoEm: new Date() }, regularUser),
    ).rejects.toThrow(/canceladoEm/);
  });

  it('rejeita reativadoEm', async () => {
    await expect(
      updateLead(10, { reativadoEm: new Date() }, regularUser),
    ).rejects.toThrow(/reativadoEm/);
  });
});

describe('updateLead — Guard 3: edição pós-venda', () => {
  it('bloqueia usuário normal tentando editar Lead em Venda (403)', async () => {
    mockPrisma.lead.findFirst.mockResolvedValue({
      ...leadBase,
      status: LeadStatus.VENDA,
    });
    await expect(
      updateLead(10, { nome: 'Novo nome' }, regularUser),
    ).rejects.toThrow(/crm:leads:edit-after-sale/);
    expect(mockPrisma.lead.update).not.toHaveBeenCalled();
  });

  it('bloqueia usuário normal tentando editar Lead em Pós-venda (403)', async () => {
    mockPrisma.lead.findFirst.mockResolvedValue({
      ...leadBase,
      status: LeadStatus.POS_VENDA,
    });
    await expect(
      updateLead(10, { nome: 'X' }, regularUser),
    ).rejects.toThrow(/crm:leads:edit-after-sale/);
  });

  it('permite ADM com edit-after-sale editar Lead em Venda', async () => {
    mockPrisma.lead.findFirst.mockResolvedValue({
      ...leadBase,
      status: LeadStatus.VENDA,
    });
    await updateLead(10, { nome: 'Venda cancelada — retificação' }, admUser);
    expect(mockPrisma.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ nome: 'Venda cancelada — retificação' }),
      }),
    );
  });

  it('ADM sem permissão edit-after-sale é bloqueado (role ADM sozinho não basta)', async () => {
    mockPrisma.lead.findFirst.mockResolvedValue({
      ...leadBase,
      status: LeadStatus.VENDA,
    });
    const admSemPerm = { id: 1, role: 'ADM', filialId: null, permissions: ['*'] };
    await expect(
      updateLead(10, { nome: 'X' }, admSemPerm),
    ).rejects.toThrow(/crm:leads:edit-after-sale/);
  });

  it('não aplica guard para Lead em status intermediário', async () => {
    mockPrisma.lead.findFirst.mockResolvedValue({
      ...leadBase,
      status: LeadStatus.EM_PROSPECCAO,
    });
    await updateLead(10, { nome: 'X' }, regularUser);
    expect(mockPrisma.lead.update).toHaveBeenCalled();
  });

  it('não aplica guard para Lead Cancelado (só Venda/Pós-venda)', async () => {
    mockPrisma.lead.findFirst.mockResolvedValue({
      ...leadBase,
      status: LeadStatus.CANCELADO,
    });
    await updateLead(10, { nome: 'X' }, regularUser);
    expect(mockPrisma.lead.update).toHaveBeenCalled();
  });
});

describe('updateLead — happy path', () => {
  it('atualiza campos permitidos e retorna Lead atualizado', async () => {
    const r = await updateLead(
      10,
      { nome: 'Novo', sobrenome: 'Nome', email: 'X@Test.com' },
      regularUser,
    );
    expect(mockPrisma.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 10 },
        data: expect.objectContaining({
          nome: 'Novo',
          sobrenome: 'Nome',
          email: 'x@test.com', // normalizado lowercase
        }),
      }),
    );
    expect(r.nome).toBe('Novo');
  });

  it('status e etapa NÃO aparecem na data do update (mesmo se um bug no guard deixasse passar)', async () => {
    // Não passamos status/etapa no body, mas queremos confirmar que o service
    // simplesmente não os inclui na chamada ao Prisma
    await updateLead(10, { nome: 'X' }, regularUser);
    const updateData = mockPrisma.lead.update.mock.calls[0][0].data;
    expect(updateData).not.toHaveProperty('status');
    expect(updateData).not.toHaveProperty('etapa');
  });
});
