/**
 * Tipos de evento registrados no LeadHistory (append-only).
 *
 * Fonte de verdade: specs/crm.md §4.4 (LeadHistory)
 *                   specs/crm-plan.md §2.4
 *
 * Cada evento carrega um `payload` (JSON) cuja shape é documentada
 * em PAYLOAD_SHAPES abaixo — essa é a referência canônica consumida
 * por leadHistoryService ao validar antes de inserir.
 */

export const LeadEventType = Object.freeze({
  STATUS_CHANGED: 'status_changed',
  TEMPERATURA_CHANGED: 'temperatura_changed',
  VENDEDOR_TRANSFERRED: 'vendedor_transferred',
  PREVENDEDOR_TRANSFERRED: 'prevendedor_transferred',
  AGENDA_SCHEDULED: 'agenda_scheduled',
  NON_GENERATED: 'non_generated',
  LEAD_CANCELLED: 'lead_cancelled',
  LEAD_REACTIVATED: 'lead_reactivated',
  REACTIVATED_AS_NEW_LEAD: 'reactivated_as_new_lead',
  CREATED_FROM_REACTIVATION: 'created_from_reactivation',
  NOTE_ADDED: 'note_added',
  EXTERNAL_CREATED: 'external_created',
});

const ALL_EVENT_TYPES = Object.freeze(Object.values(LeadEventType));

export function getAllEventTypes() {
  return ALL_EVENT_TYPES;
}

export function isValidEventType(value) {
  return ALL_EVENT_TYPES.includes(value);
}

/**
 * Chaves obrigatórias esperadas no payload de cada evento.
 * Validação completa de tipos fica a cargo do leadHistoryService (Task #7).
 * Aqui só declaramos o contrato estrutural.
 */
export const PAYLOAD_SHAPES = Object.freeze({
  [LeadEventType.STATUS_CHANGED]: ['from', 'to'],
  [LeadEventType.TEMPERATURA_CHANGED]: ['from', 'to'],
  [LeadEventType.VENDEDOR_TRANSFERRED]: ['fromUserId', 'toUserId', 'reason'],
  [LeadEventType.PREVENDEDOR_TRANSFERRED]: ['fromUserId', 'toUserId', 'reason'],
  [LeadEventType.AGENDA_SCHEDULED]: ['tipo', 'dataHora'],
  [LeadEventType.NON_GENERATED]: ['nonId'],
  [LeadEventType.LEAD_CANCELLED]: ['reason'],
  [LeadEventType.LEAD_REACTIVATED]: [],
  [LeadEventType.REACTIVATED_AS_NEW_LEAD]: ['newLeadId'],
  [LeadEventType.CREATED_FROM_REACTIVATION]: ['sourceLeadId'],
  [LeadEventType.NOTE_ADDED]: ['text'],
  [LeadEventType.EXTERNAL_CREATED]: ['source'],
});

export function getRequiredPayloadKeys(eventType) {
  if (!isValidEventType(eventType)) {
    throw new Error(`Tipo de evento inválido: "${eventType}"`);
  }
  return PAYLOAD_SHAPES[eventType];
}
