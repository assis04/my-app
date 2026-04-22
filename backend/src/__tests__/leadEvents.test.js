import { describe, it, expect } from 'vitest';
import {
  LeadEventType,
  PAYLOAD_SHAPES,
  getAllEventTypes,
  isValidEventType,
  getRequiredPayloadKeys,
} from '../domain/leadEvents.js';

describe('LeadEventType enum', () => {
  it('contains all 12 event types defined in the spec (§4.4)', () => {
    expect(getAllEventTypes()).toEqual([
      'status_changed',
      'temperatura_changed',
      'vendedor_transferred',
      'prevendedor_transferred',
      'agenda_scheduled',
      'non_generated',
      'lead_cancelled',
      'lead_reactivated',
      'reactivated_as_new_lead',
      'created_from_reactivation',
      'note_added',
      'external_created',
    ]);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(LeadEventType)).toBe(true);
  });
});

describe('isValidEventType()', () => {
  it('returns true for every canonical event type', () => {
    for (const eventType of getAllEventTypes()) {
      expect(isValidEventType(eventType)).toBe(true);
    }
  });

  it('returns false for unknown or malformed values', () => {
    expect(isValidEventType('unknown_event')).toBe(false);
    expect(isValidEventType('STATUS_CHANGED')).toBe(false); // case-sensitive
    expect(isValidEventType('')).toBe(false);
    expect(isValidEventType(null)).toBe(false);
    expect(isValidEventType(undefined)).toBe(false);
  });
});

describe('PAYLOAD_SHAPES contract', () => {
  it('declares required keys for every event type', () => {
    for (const eventType of getAllEventTypes()) {
      expect(PAYLOAD_SHAPES[eventType]).toBeDefined();
      expect(Array.isArray(PAYLOAD_SHAPES[eventType])).toBe(true);
    }
  });

  it('is frozen at top level', () => {
    expect(Object.isFrozen(PAYLOAD_SHAPES)).toBe(true);
  });

  it('matches the spec §4.4 contracts', () => {
    expect(PAYLOAD_SHAPES[LeadEventType.STATUS_CHANGED]).toEqual(['from', 'to']);
    expect(PAYLOAD_SHAPES[LeadEventType.TEMPERATURA_CHANGED]).toEqual(['from', 'to']);
    expect(PAYLOAD_SHAPES[LeadEventType.VENDEDOR_TRANSFERRED]).toEqual(['fromUserId', 'toUserId', 'reason']);
    expect(PAYLOAD_SHAPES[LeadEventType.PREVENDEDOR_TRANSFERRED]).toEqual(['fromUserId', 'toUserId', 'reason']);
    expect(PAYLOAD_SHAPES[LeadEventType.AGENDA_SCHEDULED]).toEqual(['tipo', 'dataHora']);
    expect(PAYLOAD_SHAPES[LeadEventType.NON_GENERATED]).toEqual(['nonId']);
    expect(PAYLOAD_SHAPES[LeadEventType.LEAD_CANCELLED]).toEqual(['reason']);
    expect(PAYLOAD_SHAPES[LeadEventType.LEAD_REACTIVATED]).toEqual([]);
    expect(PAYLOAD_SHAPES[LeadEventType.REACTIVATED_AS_NEW_LEAD]).toEqual(['newLeadId']);
    expect(PAYLOAD_SHAPES[LeadEventType.CREATED_FROM_REACTIVATION]).toEqual(['sourceLeadId']);
    expect(PAYLOAD_SHAPES[LeadEventType.NOTE_ADDED]).toEqual(['text']);
    expect(PAYLOAD_SHAPES[LeadEventType.EXTERNAL_CREATED]).toEqual(['source']);
  });
});

describe('getRequiredPayloadKeys()', () => {
  it('returns the declared keys for a valid event type', () => {
    expect(getRequiredPayloadKeys(LeadEventType.STATUS_CHANGED)).toEqual(['from', 'to']);
    expect(getRequiredPayloadKeys(LeadEventType.LEAD_REACTIVATED)).toEqual([]);
  });

  it('throws for an invalid event type', () => {
    expect(() => getRequiredPayloadKeys('bogus')).toThrow(/inválido/);
    expect(() => getRequiredPayloadKeys(null)).toThrow(/inválido/);
  });
});

describe('Enum integrity — total coverage', () => {
  it('PAYLOAD_SHAPES has exactly one entry per event type', () => {
    const shapedTypes = Object.keys(PAYLOAD_SHAPES);
    const allTypes = getAllEventTypes();
    expect(shapedTypes.sort()).toEqual(allTypes.slice().sort());
  });
});
