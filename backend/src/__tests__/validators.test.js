import { describe, it, expect } from 'vitest';
import {
  quickLeadSchema,
  manualLeadSchema,
  toggleStatusSchema,
  createLeadSchema,
  transferLeadsSchema,
  transitionStatusSchema,
  temperaturaSchema,
  cancelLeadSchema,
  reactivateLeadSchema,
} from '../validators/leadValidator.js';
import { createTaskSchema, updateTaskStatusSchema } from '../validators/taskValidator.js';

describe('quickLeadSchema', () => {
  it('should validate a valid quick lead', () => {
    const result = quickLeadSchema.safeParse({
      branch_id: 1,
      telefone: '11999887766',
    });
    expect(result.success).toBe(true);
    expect(result.data.branch_id).toBe(1);
  });

  it('should accept branch_id as string and coerce to number', () => {
    const result = quickLeadSchema.safeParse({
      branch_id: '3',
      telefone: '11999887766',
    });
    expect(result.success).toBe(true);
    expect(result.data.branch_id).toBe(3);
  });

  it('should reject missing branch_id', () => {
    const result = quickLeadSchema.safeParse({ telefone: '11999887766' });
    expect(result.success).toBe(false);
  });

  it('should reject short telefone', () => {
    const result = quickLeadSchema.safeParse({ branch_id: 1, telefone: '123' });
    expect(result.success).toBe(false);
  });

  it('should provide defaults for optional fields', () => {
    const result = quickLeadSchema.safeParse({
      branch_id: 1,
      telefone: '11999887766',
    });
    expect(result.data.etapa).toBe('Novo');
    expect(result.data.status).toBe('Ativo');
    expect(result.data.nome).toBe('');
  });
});

describe('manualLeadSchema', () => {
  it('should require assigned_user_id', () => {
    const result = manualLeadSchema.safeParse({
      branch_id: 1,
      telefone: '11999887766',
    });
    expect(result.success).toBe(false);
  });

  it('should accept valid manual lead', () => {
    const result = manualLeadSchema.safeParse({
      branch_id: 1,
      telefone: '11999887766',
      assigned_user_id: '5',
    });
    expect(result.success).toBe(true);
    expect(result.data.assigned_user_id).toBe(5);
  });
});

describe('toggleStatusSchema', () => {
  it('should validate a valid toggle', () => {
    const result = toggleStatusSchema.safeParse({
      branch_id: 1,
      is_available: true,
    });
    expect(result.success).toBe(true);
  });

  it('should reject non-boolean is_available', () => {
    const result = toggleStatusSchema.safeParse({
      branch_id: 1,
      is_available: 'yes',
    });
    expect(result.success).toBe(false);
  });

  it('should accept optional user_id', () => {
    const result = toggleStatusSchema.safeParse({
      branch_id: 1,
      is_available: false,
      user_id: '10',
    });
    expect(result.success).toBe(true);
    expect(result.data.user_id).toBe(10);
  });
});

describe('createLeadSchema', () => {
  it('should validate a complete lead', () => {
    const result = createLeadSchema.safeParse({
      nome: 'João',
      celular: '11999887766',
      cep: '01001000',
      preVendedorId: null,
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty nome', () => {
    const result = createLeadSchema.safeParse({
      nome: '',
      celular: '11999887766',
      cep: '01001000',
      preVendedorId: null,
    });
    expect(result.success).toBe(false);
  });

  it('should coerce preVendedorId from string to number', () => {
    const result = createLeadSchema.safeParse({
      nome: 'Maria',
      celular: '11999887766',
      cep: '01001000',
      preVendedorId: '7',
    });
    expect(result.success).toBe(true);
    expect(result.data.preVendedorId).toBe(7);
  });

  it('should coerce empty preVendedorId to null', () => {
    const result = createLeadSchema.safeParse({
      nome: 'Maria',
      celular: '11999887766',
      cep: '01001000',
      preVendedorId: '',
    });
    expect(result.success).toBe(true);
    expect(result.data.preVendedorId).toBeNull();
  });
});

describe('transferLeadsSchema', () => {
  it('should validate valid transfer', () => {
    const result = transferLeadsSchema.safeParse({
      leadIds: [1, 2, 3],
      preVendedorId: '5',
    });
    expect(result.success).toBe(true);
    expect(result.data.preVendedorId).toBe(5);
  });

  it('should reject empty leadIds array', () => {
    const result = transferLeadsSchema.safeParse({
      leadIds: [],
      preVendedorId: 5,
    });
    expect(result.success).toBe(false);
  });
});

describe('createTaskSchema', () => {
  it('should validate minimal task', () => {
    const result = createTaskSchema.safeParse({
      titulo: 'Fazer follow-up',
    });
    expect(result.success).toBe(true);
  });

  it('should reject titulo exceeding 300 chars', () => {
    const result = createTaskSchema.safeParse({
      titulo: 'a'.repeat(301),
    });
    expect(result.success).toBe(false);
  });
});

describe('updateTaskStatusSchema', () => {
  it('should accept valid statuses', () => {
    for (const status of ['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA']) {
      const result = updateTaskStatusSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid status', () => {
    const result = updateTaskStatusSchema.safeParse({ status: 'INVALIDO' });
    expect(result.success).toBe(false);
  });
});

describe('createLeadSchema / updateLeadSchema — regression guard', () => {
  it('NÃO materializa status/etapa com defaults (senão Guard 1 do updateLead dispara)', () => {
    // Regressão cara: se alguém adicionar `status: z.string().optional().default('X')`
    // no schema, o updateLeadSchema (= partial) materializa o default mesmo quando
    // o cliente não envia o campo. Isso fura o Guard 1 de leadCrmService.updateLead
    // e quebra TODO save via PUT /leads/:id.
    const r = createLeadSchema.safeParse({
      nome: 'Teste',
      celular: '11999999999',
      cep: '01000000',
      preVendedorId: null,
    });
    expect(r.success).toBe(true);
    expect(r.data).not.toHaveProperty('status');
    expect(r.data).not.toHaveProperty('etapa');
    expect(r.data).not.toHaveProperty('etapaJornada');
    expect(r.data).not.toHaveProperty('idKanban');
  });

  it('updateLeadSchema (partial) também não materializa status/etapa em save parcial', () => {
    // Exatamente o caso que quebrou em staging: frontend manda só alguns campos
    const updateLeadSchema = createLeadSchema.partial();
    const r = updateLeadSchema.safeParse({ nome: 'Editado' });
    expect(r.success).toBe(true);
    expect(r.data).not.toHaveProperty('status');
    expect(r.data).not.toHaveProperty('etapa');
  });

  it('silenciosamente descarta status/etapa/idKanban se enviados (strip, não reject)', () => {
    const r = createLeadSchema.safeParse({
      nome: 'X',
      celular: '11999999999',
      cep: '01000000',
      preVendedorId: null,
      status: 'Venda',              // frontend legado
      etapa: 'Qualquer',            // idem
      idKanban: 'col-123',          // idem
    });
    expect(r.success).toBe(true);
    // Campos desconhecidos são dropados por Zod — não aparecem no parsed data
    expect(r.data).not.toHaveProperty('status');
    expect(r.data).not.toHaveProperty('etapa');
    expect(r.data).not.toHaveProperty('idKanban');
  });
});

describe('transitionStatusSchema', () => {
  it('aceita payload mínimo só com status', () => {
    const r = transitionStatusSchema.safeParse({ status: 'Venda' });
    expect(r.success).toBe(true);
    expect(r.data.motivo).toBeUndefined();
    expect(r.data.contexto).toEqual({});
  });

  it('rejeita status ausente ou vazio', () => {
    expect(transitionStatusSchema.safeParse({}).success).toBe(false);
    expect(transitionStatusSchema.safeParse({ status: '' }).success).toBe(false);
  });

  it('aceita motivo como string', () => {
    const r = transitionStatusSchema.safeParse({ status: 'Cancelado', motivo: 'cliente desistiu' });
    expect(r.success).toBe(true);
    expect(r.data.motivo).toBe('cliente desistiu');
  });

  it('aceita contexto.agendadoPara como ISO 8601 com offset', () => {
    const r = transitionStatusSchema.safeParse({
      status: 'Agendado vídeo chamada',
      contexto: { agendadoPara: '2026-05-01T14:00:00Z' },
    });
    expect(r.success).toBe(true);
    expect(r.data.contexto.agendadoPara).toBe('2026-05-01T14:00:00Z');
  });

  it('rejeita agendadoPara com formato inválido', () => {
    const r = transitionStatusSchema.safeParse({
      status: 'Agendado vídeo chamada',
      contexto: { agendadoPara: '01/05/2026' },
    });
    expect(r.success).toBe(false);
  });

  it('deixa passar campos extras em contexto (passthrough)', () => {
    const r = transitionStatusSchema.safeParse({
      status: 'Aguardando Planta/medidas',
      contexto: { agendadoPara: '2026-05-01T14:00:00Z', obs: 'planta do apto 202' },
    });
    expect(r.success).toBe(true);
    expect(r.data.contexto.obs).toBe('planta do apto 202');
  });
});

describe('temperaturaSchema', () => {
  it('aceita os 4 valores canônicos', () => {
    for (const t of ['Sem contato', 'Pouco interesse', 'Muito interesse', 'Sem interesse']) {
      const r = temperaturaSchema.safeParse({ temperatura: t });
      expect(r.success).toBe(true);
      expect(r.data.temperatura).toBe(t);
    }
  });

  it('rejeita valor fora do enum', () => {
    expect(temperaturaSchema.safeParse({ temperatura: 'Quente' }).success).toBe(false);
    expect(temperaturaSchema.safeParse({ temperatura: 'muito interesse' }).success).toBe(false);
    // valores antigos (renomeados em 2026-05-07) também são rejeitados
    expect(temperaturaSchema.safeParse({ temperatura: 'Muito interessado' }).success).toBe(false);
    expect(temperaturaSchema.safeParse({ temperatura: 'Interessado' }).success).toBe(false);
  });

  it('rejeita campo ausente', () => {
    expect(temperaturaSchema.safeParse({}).success).toBe(false);
  });
});

describe('cancelLeadSchema', () => {
  it('aceita motivo string válido', () => {
    const r = cancelLeadSchema.safeParse({ motivo: 'Cliente desistiu' });
    expect(r.success).toBe(true);
    expect(r.data.motivo).toBe('Cliente desistiu');
  });

  it('aplica trim no motivo', () => {
    const r = cancelLeadSchema.safeParse({ motivo: '  com espaço  ' });
    expect(r.success).toBe(true);
    expect(r.data.motivo).toBe('com espaço');
  });

  it('rejeita motivo ausente', () => {
    expect(cancelLeadSchema.safeParse({}).success).toBe(false);
  });

  it('rejeita motivo vazio ou só whitespace (após trim)', () => {
    expect(cancelLeadSchema.safeParse({ motivo: '' }).success).toBe(false);
    expect(cancelLeadSchema.safeParse({ motivo: '   ' }).success).toBe(false);
  });

  it('rejeita motivo acima do limite de 1000 chars', () => {
    const longText = 'x'.repeat(1001);
    expect(cancelLeadSchema.safeParse({ motivo: longText }).success).toBe(false);
  });
});

describe('reactivateLeadSchema', () => {
  it('aceita modo="reativar" com motivo', () => {
    const r = reactivateLeadSchema.safeParse({ modo: 'reativar', motivo: 'cliente voltou' });
    expect(r.success).toBe(true);
    expect(r.data.modo).toBe('reativar');
    expect(r.data.motivo).toBe('cliente voltou');
  });

  it('aceita modo="novo" sem motivo (motivo é opcional)', () => {
    const r = reactivateLeadSchema.safeParse({ modo: 'novo' });
    expect(r.success).toBe(true);
    expect(r.data.motivo).toBe('');
  });

  it('rejeita modo inválido', () => {
    expect(reactivateLeadSchema.safeParse({ modo: 'ressuscitar' }).success).toBe(false);
    expect(reactivateLeadSchema.safeParse({ modo: '' }).success).toBe(false);
  });

  it('rejeita modo ausente', () => {
    expect(reactivateLeadSchema.safeParse({}).success).toBe(false);
  });
});
