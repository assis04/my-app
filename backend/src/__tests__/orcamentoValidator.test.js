import { describe, it, expect } from 'vitest';
import {
  createOrcamentoSchema,
  transitionOrcamentoSchema,
  cancelOrcamentoSchema,
  reactivateOrcamentoSchema,
} from '../validators/orcamentoValidator.js';

describe('createOrcamentoSchema', () => {
  it('aceita leadId numérico', () => {
    expect(createOrcamentoSchema.safeParse({ leadId: 42 }).success).toBe(true);
  });

  it('coerce leadId de string pra número', () => {
    const r = createOrcamentoSchema.safeParse({ leadId: '42' });
    expect(r.success).toBe(true);
    expect(r.data.leadId).toBe(42);
  });

  it('rejeita leadId ausente', () => {
    expect(createOrcamentoSchema.safeParse({}).success).toBe(false);
  });

  it('rejeita leadId zero ou negativo', () => {
    expect(createOrcamentoSchema.safeParse({ leadId: 0 }).success).toBe(false);
    expect(createOrcamentoSchema.safeParse({ leadId: -1 }).success).toBe(false);
  });

  it('rejeita leadId não-numérico', () => {
    expect(createOrcamentoSchema.safeParse({ leadId: 'abc' }).success).toBe(false);
  });
});

describe('transitionOrcamentoSchema', () => {
  it.each(['Nova O.N.', 'Não Responde', 'Standby'])('aceita "%s"', (status) => {
    expect(transitionOrcamentoSchema.safeParse({ status }).success).toBe(true);
  });

  it('rejeita Cancelado (tem endpoint dedicado /cancel)', () => {
    const r = transitionOrcamentoSchema.safeParse({ status: 'Cancelado' });
    expect(r.success).toBe(false);
  });

  it('rejeita status desconhecido', () => {
    expect(transitionOrcamentoSchema.safeParse({ status: 'Aberto' }).success).toBe(false);
  });

  it('rejeita status ausente', () => {
    expect(transitionOrcamentoSchema.safeParse({}).success).toBe(false);
  });
});

describe('cancelOrcamentoSchema', () => {
  const motivosCanonicos = [
    'Desistiu de realizar a compra',
    'Não Responde',
    'Comprou na concorrência',
    'Comprou móveis convencionais',
    'O perfil não se encaixa com o produto',
  ];

  it.each(motivosCanonicos)('aceita motivo canônico: "%s"', (motivo) => {
    expect(cancelOrcamentoSchema.safeParse({ motivo }).success).toBe(true);
  });

  it('rejeita motivo fora do enum', () => {
    expect(cancelOrcamentoSchema.safeParse({ motivo: 'Outro motivo qualquer' }).success).toBe(false);
  });

  it('rejeita motivo ausente', () => {
    expect(cancelOrcamentoSchema.safeParse({}).success).toBe(false);
  });

  it('rejeita motivo vazio', () => {
    expect(cancelOrcamentoSchema.safeParse({ motivo: '' }).success).toBe(false);
  });
});

describe('reactivateOrcamentoSchema', () => {
  it('aceita body vazio', () => {
    expect(reactivateOrcamentoSchema.safeParse({}).success).toBe(true);
  });

  it('rejeita campos extras (.strict)', () => {
    expect(reactivateOrcamentoSchema.safeParse({ extra: 'field' }).success).toBe(false);
  });
});
