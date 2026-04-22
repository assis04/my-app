import { describe, it, expect } from 'vitest';
import {
  validateTransition,
  getSideEffects,
  SideEffectType,
  statusMachine,
} from '../services/statusMachine.js';
import { LeadStatus, getAllStatuses } from '../domain/leadStatus.js';

describe('validateTransition — inputs inválidos', () => {
  it('rejeita status de origem desconhecido', () => {
    const r = validateTransition('Ativo', LeadStatus.EM_PROSPECCAO);
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/origem inválido/i);
  });

  it('rejeita status de destino desconhecido', () => {
    const r = validateTransition(LeadStatus.EM_PROSPECCAO, 'Ganho');
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/destino inválido/i);
  });

  it('rejeita null/undefined/string vazia', () => {
    expect(validateTransition(null, LeadStatus.VENDA).allowed).toBe(false);
    expect(validateTransition(LeadStatus.VENDA, undefined).allowed).toBe(false);
    expect(validateTransition('', LeadStatus.VENDA).allowed).toBe(false);
  });

  it('rejeita transição para o mesmo status (no-op)', () => {
    for (const s of getAllStatuses()) {
      const r = validateTransition(s, s);
      expect(r.allowed).toBe(false);
      expect(r.reason).toMatch(/mesmo status/i);
    }
  });
});

describe('validateTransition — Cancelado é saída exclusiva por /reactivate', () => {
  it('bloqueia QUALQUER transição normal saindo de Cancelado', () => {
    for (const to of getAllStatuses()) {
      if (to === LeadStatus.CANCELADO) continue;
      const r = validateTransition(LeadStatus.CANCELADO, to);
      expect(r.allowed).toBe(false);
      expect(r.reason).toMatch(/reativação/i);
    }
  });
});

describe('validateTransition — Venda', () => {
  it('permite Venda → Pós-venda', () => {
    expect(validateTransition(LeadStatus.VENDA, LeadStatus.POS_VENDA).allowed).toBe(true);
  });

  it('permite Venda → Cancelado (cancelamento de venda)', () => {
    expect(validateTransition(LeadStatus.VENDA, LeadStatus.CANCELADO).allowed).toBe(true);
  });

  it('bloqueia Venda → qualquer status intermediário', () => {
    const intermediates = [
      LeadStatus.EM_PROSPECCAO,
      LeadStatus.AGUARDANDO_PLANTA,
      LeadStatus.AGENDADO_VIDEO,
      LeadStatus.AGENDADO_VISITA,
      LeadStatus.EM_ATENDIMENTO_LOJA,
    ];
    for (const to of intermediates) {
      const r = validateTransition(LeadStatus.VENDA, to);
      expect(r.allowed).toBe(false);
      expect(r.reason).toMatch(/Pós-venda.*Cancelado/);
    }
  });
});

describe('validateTransition — Pós-venda', () => {
  it('permite Pós-venda → Cancelado (cancelamento de venda)', () => {
    expect(validateTransition(LeadStatus.POS_VENDA, LeadStatus.CANCELADO).allowed).toBe(true);
  });

  it('bloqueia Pós-venda → qualquer outro status', () => {
    for (const to of getAllStatuses()) {
      if (to === LeadStatus.CANCELADO || to === LeadStatus.POS_VENDA) continue;
      const r = validateTransition(LeadStatus.POS_VENDA, to);
      expect(r.allowed).toBe(false);
    }
  });
});

describe('validateTransition — Pós-venda só vem de Venda', () => {
  it('bloqueia intermediário → Pós-venda', () => {
    const intermediates = [
      LeadStatus.EM_PROSPECCAO,
      LeadStatus.AGUARDANDO_PLANTA,
      LeadStatus.AGENDADO_VIDEO,
      LeadStatus.AGENDADO_VISITA,
      LeadStatus.EM_ATENDIMENTO_LOJA,
    ];
    for (const from of intermediates) {
      const r = validateTransition(from, LeadStatus.POS_VENDA);
      expect(r.allowed).toBe(false);
      expect(r.reason).toMatch(/Venda.*primeiro/);
    }
  });

  it('permite Venda → Pós-venda (já coberto, aqui como regressão do caminho feliz)', () => {
    expect(validateTransition(LeadStatus.VENDA, LeadStatus.POS_VENDA).allowed).toBe(true);
  });
});

describe('validateTransition — transições livres entre intermediários e terminais', () => {
  const intermediates = [
    LeadStatus.EM_PROSPECCAO,
    LeadStatus.AGUARDANDO_PLANTA,
    LeadStatus.AGENDADO_VIDEO,
    LeadStatus.AGENDADO_VISITA,
    LeadStatus.EM_ATENDIMENTO_LOJA,
  ];

  it('qualquer intermediário → qualquer outro intermediário é permitido', () => {
    for (const from of intermediates) {
      for (const to of intermediates) {
        if (from === to) continue;
        const r = validateTransition(from, to);
        expect(r.allowed, `${from} → ${to}`).toBe(true);
      }
    }
  });

  it('qualquer intermediário → Venda é permitido', () => {
    for (const from of intermediates) {
      expect(validateTransition(from, LeadStatus.VENDA).allowed).toBe(true);
    }
  });

  it('qualquer intermediário → Cancelado é permitido (usado pelo endpoint /cancel)', () => {
    for (const from of intermediates) {
      expect(validateTransition(from, LeadStatus.CANCELADO).allowed).toBe(true);
    }
  });
});

describe('getSideEffects', () => {
  it('Em prospecção → nenhum side-effect extra', () => {
    expect(getSideEffects(LeadStatus.EM_PROSPECCAO)).toEqual([]);
  });

  it('Em Atendimento Loja → nenhum side-effect extra', () => {
    expect(getSideEffects(LeadStatus.EM_ATENDIMENTO_LOJA)).toEqual([]);
  });

  it('Venda → nenhum side-effect extra (read-only é propriedade do status, não side-effect)', () => {
    expect(getSideEffects(LeadStatus.VENDA)).toEqual([]);
  });

  it('Pós-venda → nenhum side-effect extra', () => {
    expect(getSideEffects(LeadStatus.POS_VENDA)).toEqual([]);
  });

  it('Aguardando Planta → abre agenda para coleta', () => {
    const effects = getSideEffects(LeadStatus.AGUARDANDO_PLANTA, { dataHora: '2026-05-01T10:00:00Z' });
    expect(effects).toHaveLength(1);
    expect(effects[0].type).toBe(SideEffectType.AGENDA_OPEN);
    expect(effects[0].payload.tipo).toBe('coleta_planta_medidas');
    expect(effects[0].payload.dataHora).toBe('2026-05-01T10:00:00Z');
  });

  it('Agendado vídeo → abre N.O.N. se ausente + agenda para videochamada', () => {
    const effects = getSideEffects(LeadStatus.AGENDADO_VIDEO, { dataHora: '2026-05-02T14:00:00Z' });
    expect(effects).toHaveLength(2);
    expect(effects[0].type).toBe(SideEffectType.NON_OPEN_OR_CREATE);
    expect(effects[0].payload.mode).toBe('open_if_absent');
    expect(effects[1].type).toBe(SideEffectType.AGENDA_OPEN);
    expect(effects[1].payload.tipo).toBe('video_chamada');
  });

  it('Agendado visita → cria N.O.N. se ausente + agenda para visita', () => {
    const effects = getSideEffects(LeadStatus.AGENDADO_VISITA);
    expect(effects).toHaveLength(2);
    expect(effects[0].type).toBe(SideEffectType.NON_OPEN_OR_CREATE);
    expect(effects[0].payload.mode).toBe('create_if_absent');
    expect(effects[1].type).toBe(SideEffectType.AGENDA_OPEN);
    expect(effects[1].payload.tipo).toBe('visita_loja');
  });

  it('Cancelado → side-effect SET_CANCEL_FIELDS com motivo', () => {
    const effects = getSideEffects(LeadStatus.CANCELADO, { reason: 'Cliente desistiu' });
    expect(effects).toHaveLength(1);
    expect(effects[0].type).toBe(SideEffectType.SET_CANCEL_FIELDS);
    expect(effects[0].payload.reason).toBe('Cliente desistiu');
  });

  it('Cancelado sem motivo no contexto → payload.reason = null (validação de motivo é do orquestrador)', () => {
    const effects = getSideEffects(LeadStatus.CANCELADO);
    expect(effects[0].payload.reason).toBeNull();
  });

  it('AGENDA_OPEN sem dataHora no contexto → payload.dataHora = null (preenchida depois)', () => {
    const effects = getSideEffects(LeadStatus.AGUARDANDO_PLANTA);
    expect(effects[0].payload.dataHora).toBeNull();
  });

  it('lança para status inválido', () => {
    expect(() => getSideEffects('Ganho')).toThrow(/inválido/);
    expect(() => getSideEffects(null)).toThrow(/inválido/);
  });

  it('SideEffectType está congelado', () => {
    expect(Object.isFrozen(SideEffectType)).toBe(true);
  });
});

describe('statusMachine — fachada pública', () => {
  it('expõe todas as funções da API do plan §2.1', () => {
    expect(typeof statusMachine.validateTransition).toBe('function');
    expect(typeof statusMachine.getSideEffects).toBe('function');
    expect(typeof statusMachine.getEtapaForStatus).toBe('function');
    expect(typeof statusMachine.isTerminal).toBe('function');
    expect(typeof statusMachine.requiresAdminToEdit).toBe('function');
  });

  it('está congelado', () => {
    expect(Object.isFrozen(statusMachine)).toBe(true);
  });

  it('isTerminal casa com o helper do domínio', () => {
    expect(statusMachine.isTerminal(LeadStatus.VENDA)).toBe(true);
    expect(statusMachine.isTerminal(LeadStatus.EM_PROSPECCAO)).toBe(false);
  });

  it('requiresAdminToEdit casa com o helper do domínio', () => {
    expect(statusMachine.requiresAdminToEdit(LeadStatus.VENDA)).toBe(true);
    expect(statusMachine.requiresAdminToEdit(LeadStatus.CANCELADO)).toBe(false);
  });

  it('getEtapaForStatus casa com o helper do domínio', () => {
    expect(statusMachine.getEtapaForStatus(LeadStatus.AGENDADO_VIDEO)).toBe('Negociação');
  });
});

describe('cobertura exaustiva — matriz de transições', () => {
  it('toda combinação válida de (from, to) retorna um veredito determinístico', () => {
    const all = getAllStatuses();
    for (const from of all) {
      for (const to of all) {
        const r = validateTransition(from, to);
        expect(typeof r.allowed).toBe('boolean');
        if (!r.allowed) expect(typeof r.reason).toBe('string');
      }
    }
  });
});
