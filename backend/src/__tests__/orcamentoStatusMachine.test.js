import { describe, it, expect } from 'vitest';
import { validateTransition, orcamentoStatusMachine } from '../services/orcamentoStatusMachine.js';
import { OrcamentoStatus } from '../domain/orcamentoStatus.js';

describe('orcamentoStatusMachine.validateTransition', () => {
  describe('transições válidas entre não-terminais', () => {
    it('Nova O.N. → Não Responde', () => {
      expect(validateTransition(OrcamentoStatus.NOVA, OrcamentoStatus.NAO_RESPONDE)).toEqual({ allowed: true });
    });
    it('Nova O.N. → Standby', () => {
      expect(validateTransition(OrcamentoStatus.NOVA, OrcamentoStatus.STANDBY)).toEqual({ allowed: true });
    });
    it('Não Responde → Nova O.N.', () => {
      expect(validateTransition(OrcamentoStatus.NAO_RESPONDE, OrcamentoStatus.NOVA)).toEqual({ allowed: true });
    });
    it('Não Responde → Standby', () => {
      expect(validateTransition(OrcamentoStatus.NAO_RESPONDE, OrcamentoStatus.STANDBY)).toEqual({ allowed: true });
    });
    it('Standby → Nova O.N.', () => {
      expect(validateTransition(OrcamentoStatus.STANDBY, OrcamentoStatus.NOVA)).toEqual({ allowed: true });
    });
    it('Standby → Não Responde', () => {
      expect(validateTransition(OrcamentoStatus.STANDBY, OrcamentoStatus.NAO_RESPONDE)).toEqual({ allowed: true });
    });
  });

  describe('transições bloqueadas — devem usar endpoint dedicado', () => {
    it('qualquer não-terminal → Cancelado deve apontar para /cancel', () => {
      const res = validateTransition(OrcamentoStatus.NOVA, OrcamentoStatus.CANCELADO);
      expect(res.allowed).toBe(false);
      expect(res.reason).toMatch(/\/cancel/);
    });

    it('Cancelado → qualquer status deve apontar para /reactivate', () => {
      const res = validateTransition(OrcamentoStatus.CANCELADO, OrcamentoStatus.NOVA);
      expect(res.allowed).toBe(false);
      expect(res.reason).toMatch(/\/reactivate/);
    });
  });

  describe('transições inválidas genéricas', () => {
    it('mesmo status → rejeita', () => {
      const res = validateTransition(OrcamentoStatus.NOVA, OrcamentoStatus.NOVA);
      expect(res.allowed).toBe(false);
      expect(res.reason).toMatch(/mesmo status/i);
    });

    it('status de origem inválido → rejeita', () => {
      const res = validateTransition('InvalidStatus', OrcamentoStatus.NOVA);
      expect(res.allowed).toBe(false);
      expect(res.reason).toMatch(/origem inválido/i);
    });

    it('status de destino inválido → rejeita', () => {
      const res = validateTransition(OrcamentoStatus.NOVA, 'InvalidStatus');
      expect(res.allowed).toBe(false);
      expect(res.reason).toMatch(/destino inválido/i);
    });
  });
});

describe('orcamentoStatusMachine facade', () => {
  it('é congelado', () => {
    expect(Object.isFrozen(orcamentoStatusMachine)).toBe(true);
  });

  it('expõe validateTransition e isTerminal', () => {
    expect(typeof orcamentoStatusMachine.validateTransition).toBe('function');
    expect(typeof orcamentoStatusMachine.isTerminal).toBe('function');
  });

  it('isTerminal retorna true apenas para Cancelado', () => {
    expect(orcamentoStatusMachine.isTerminal(OrcamentoStatus.CANCELADO)).toBe(true);
    expect(orcamentoStatusMachine.isTerminal(OrcamentoStatus.NOVA)).toBe(false);
    expect(orcamentoStatusMachine.isTerminal(OrcamentoStatus.STANDBY)).toBe(false);
    expect(orcamentoStatusMachine.isTerminal(OrcamentoStatus.NAO_RESPONDE)).toBe(false);
  });
});
