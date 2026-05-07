import { describe, it, expect } from 'vitest';
import {
  LeadTemperatura,
  getAllTemperaturas,
  isValidTemperatura,
} from '../domain/leadTemperatura.js';

describe('LeadTemperatura enum', () => {
  it('contém os 4 valores canônicos da spec §2', () => {
    expect(getAllTemperaturas()).toEqual([
      'Sem contato',
      'Pouco interesse',
      'Muito interesse',
      'Sem interesse',
    ]);
  });

  it('está congelado', () => {
    expect(Object.isFrozen(LeadTemperatura)).toBe(true);
  });
});

describe('isValidTemperatura()', () => {
  it('aceita os 4 valores canônicos', () => {
    for (const t of getAllTemperaturas()) {
      expect(isValidTemperatura(t)).toBe(true);
    }
  });

  it('rejeita valores inválidos', () => {
    expect(isValidTemperatura('Quente')).toBe(false);
    expect(isValidTemperatura('MUITO INTERESSE')).toBe(false); // case-sensitive
    expect(isValidTemperatura('Muito interessado')).toBe(false); // valor antigo (renomeado)
    expect(isValidTemperatura('Interessado')).toBe(false); // valor antigo (renomeado)
    expect(isValidTemperatura('')).toBe(false);
    expect(isValidTemperatura(null)).toBe(false);
    expect(isValidTemperatura(undefined)).toBe(false);
  });
});
