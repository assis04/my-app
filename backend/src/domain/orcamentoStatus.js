/**
 * Enum canônico de Status de Orçamento (N.O.N.) + motivos de cancelamento.
 *
 * Fonte de verdade: specs/crm-non.md
 *
 * Regras:
 * - Status livre entre os 3 não-terminais via endpoint /status
 * - Ir para Cancelado é exclusivo do endpoint /cancel (exige motivo enum)
 * - Sair de Cancelado é exclusivo do endpoint /reactivate
 * - Motivo de cancelamento só pode ser um dos 5 valores canônicos
 */

export const OrcamentoStatus = Object.freeze({
  NOVA: 'Nova O.N.',
  NAO_RESPONDE: 'Não Responde',
  STANDBY: 'Standby',
  CANCELADO: 'Cancelado',
});

export const MOTIVOS_CANCELAMENTO = Object.freeze([
  'Desistiu de realizar a compra',
  'Não Responde',
  'Comprou na concorrência',
  'Comprou móveis convencionais',
  'O perfil não se encaixa com o produto',
]);

export const INITIAL_STATUS = OrcamentoStatus.NOVA;

const ALL_STATUSES = Object.freeze(Object.values(OrcamentoStatus));
const MOTIVO_SET = new Set(MOTIVOS_CANCELAMENTO);

export function getAllStatuses() {
  return ALL_STATUSES;
}

export function isValidStatus(value) {
  return ALL_STATUSES.includes(value);
}

export function isValidMotivoCancelamento(value) {
  return typeof value === 'string' && MOTIVO_SET.has(value);
}

/**
 * Status terminais (V1: apenas Cancelado).
 * Sair de Cancelado exige fluxo de reativação.
 */
export function isTerminalStatus(status) {
  return status === OrcamentoStatus.CANCELADO;
}
