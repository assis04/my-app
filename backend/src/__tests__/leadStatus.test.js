import { describe, it, expect } from 'vitest';
import {
  LeadStatus,
  LeadEtapa,
  STATUS_TO_ETAPA,
  INITIAL_STATUS,
  getAllStatuses,
  getAllEtapas,
  isValidStatus,
  isValidEtapa,
  getEtapaForStatus,
  isTerminalStatus,
  requiresAdminToEdit,
} from '../domain/leadStatus.js';

describe('LeadStatus enum', () => {
  it('contains all 8 statuses defined in the spec (§7.1)', () => {
    expect(getAllStatuses()).toEqual([
      'Em prospecção',
      'Aguardando Planta/medidas',
      'Agendado vídeo chamada',
      'Agendado visita na loja',
      'Em Atendimento Loja',
      'Venda',
      'Pós-venda',
      'Cancelado',
    ]);
  });

  it('is frozen — attempting to mutate throws or is silently ignored', () => {
    expect(Object.isFrozen(LeadStatus)).toBe(true);
  });

  it('exposes "Em prospecção" as the initial status', () => {
    expect(INITIAL_STATUS).toBe(LeadStatus.EM_PROSPECCAO);
    expect(INITIAL_STATUS).toBe('Em prospecção');
  });
});

describe('LeadEtapa enum', () => {
  it('contains all 5 etapas defined in the spec (§2)', () => {
    expect(getAllEtapas()).toEqual([
      'Prospecção',
      'Negociação',
      'Venda',
      'Pós-venda',
      'Cancelados',
    ]);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(LeadEtapa)).toBe(true);
  });
});

describe('STATUS_TO_ETAPA mapping', () => {
  it('maps every status to exactly one etapa', () => {
    for (const status of getAllStatuses()) {
      expect(STATUS_TO_ETAPA[status]).toBeDefined();
      expect(isValidEtapa(STATUS_TO_ETAPA[status])).toBe(true);
    }
  });

  it('follows the canonical mapping from spec §7.2', () => {
    expect(STATUS_TO_ETAPA[LeadStatus.EM_PROSPECCAO]).toBe(LeadEtapa.PROSPECCAO);
    expect(STATUS_TO_ETAPA[LeadStatus.AGUARDANDO_PLANTA]).toBe(LeadEtapa.PROSPECCAO);
    expect(STATUS_TO_ETAPA[LeadStatus.AGENDADO_VIDEO]).toBe(LeadEtapa.NEGOCIACAO);
    expect(STATUS_TO_ETAPA[LeadStatus.AGENDADO_VISITA]).toBe(LeadEtapa.NEGOCIACAO);
    expect(STATUS_TO_ETAPA[LeadStatus.EM_ATENDIMENTO_LOJA]).toBe(LeadEtapa.NEGOCIACAO);
    expect(STATUS_TO_ETAPA[LeadStatus.VENDA]).toBe(LeadEtapa.VENDA);
    expect(STATUS_TO_ETAPA[LeadStatus.POS_VENDA]).toBe(LeadEtapa.POS_VENDA);
    expect(STATUS_TO_ETAPA[LeadStatus.CANCELADO]).toBe(LeadEtapa.CANCELADOS);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(STATUS_TO_ETAPA)).toBe(true);
  });
});

describe('isValidStatus()', () => {
  it('returns true for every canonical status', () => {
    for (const status of getAllStatuses()) {
      expect(isValidStatus(status)).toBe(true);
    }
  });

  it('returns false for legacy or invalid values', () => {
    expect(isValidStatus('Prospecção')).toBe(false);   // legacy
    expect(isValidStatus('Ativo')).toBe(false);        // legacy
    expect(isValidStatus('Novo')).toBe(false);         // legacy
    expect(isValidStatus('Ganho')).toBe(false);        // removido da spec
    expect(isValidStatus('')).toBe(false);
    expect(isValidStatus(null)).toBe(false);
    expect(isValidStatus(undefined)).toBe(false);
    expect(isValidStatus('EM PROSPECCAO')).toBe(false); // case-sensitive
  });
});

describe('isValidEtapa()', () => {
  it('returns true for every canonical etapa', () => {
    for (const etapa of getAllEtapas()) {
      expect(isValidEtapa(etapa)).toBe(true);
    }
  });

  it('returns false for invalid values', () => {
    expect(isValidEtapa('Novo')).toBe(false);
    expect(isValidEtapa('Perdidos')).toBe(false);
    expect(isValidEtapa(null)).toBe(false);
  });
});

describe('getEtapaForStatus()', () => {
  it('returns the mapped etapa for a valid status', () => {
    expect(getEtapaForStatus(LeadStatus.AGENDADO_VIDEO)).toBe(LeadEtapa.NEGOCIACAO);
    expect(getEtapaForStatus(LeadStatus.CANCELADO)).toBe(LeadEtapa.CANCELADOS);
  });

  it('throws for an invalid status', () => {
    expect(() => getEtapaForStatus('Ativo')).toThrow(/inválido/);
    expect(() => getEtapaForStatus(null)).toThrow(/inválido/);
    expect(() => getEtapaForStatus('')).toThrow(/inválido/);
  });
});

describe('isTerminalStatus()', () => {
  it('returns true for Venda, Pós-venda and Cancelado', () => {
    expect(isTerminalStatus(LeadStatus.VENDA)).toBe(true);
    expect(isTerminalStatus(LeadStatus.POS_VENDA)).toBe(true);
    expect(isTerminalStatus(LeadStatus.CANCELADO)).toBe(true);
  });

  it('returns false for intermediate statuses', () => {
    expect(isTerminalStatus(LeadStatus.EM_PROSPECCAO)).toBe(false);
    expect(isTerminalStatus(LeadStatus.AGUARDANDO_PLANTA)).toBe(false);
    expect(isTerminalStatus(LeadStatus.AGENDADO_VIDEO)).toBe(false);
    expect(isTerminalStatus(LeadStatus.AGENDADO_VISITA)).toBe(false);
    expect(isTerminalStatus(LeadStatus.EM_ATENDIMENTO_LOJA)).toBe(false);
  });
});

describe('requiresAdminToEdit()', () => {
  it('returns true only for Venda and Pós-venda (§9.14)', () => {
    expect(requiresAdminToEdit(LeadStatus.VENDA)).toBe(true);
    expect(requiresAdminToEdit(LeadStatus.POS_VENDA)).toBe(true);
  });

  it('returns false for Cancelado (cancel is universal, reactivation is what is role-gated)', () => {
    expect(requiresAdminToEdit(LeadStatus.CANCELADO)).toBe(false);
  });

  it('returns false for all non-terminal statuses', () => {
    expect(requiresAdminToEdit(LeadStatus.EM_PROSPECCAO)).toBe(false);
    expect(requiresAdminToEdit(LeadStatus.AGUARDANDO_PLANTA)).toBe(false);
    expect(requiresAdminToEdit(LeadStatus.AGENDADO_VIDEO)).toBe(false);
    expect(requiresAdminToEdit(LeadStatus.AGENDADO_VISITA)).toBe(false);
    expect(requiresAdminToEdit(LeadStatus.EM_ATENDIMENTO_LOJA)).toBe(false);
  });
});

describe('Enum integrity — total coverage', () => {
  it('STATUS_TO_ETAPA has exactly one entry per status', () => {
    const mappedStatuses = Object.keys(STATUS_TO_ETAPA);
    const allStatuses = getAllStatuses();
    expect(mappedStatuses.sort()).toEqual(allStatuses.slice().sort());
  });

  it('every mapped etapa exists in LeadEtapa', () => {
    for (const etapa of Object.values(STATUS_TO_ETAPA)) {
      expect(getAllEtapas()).toContain(etapa);
    }
  });
});
