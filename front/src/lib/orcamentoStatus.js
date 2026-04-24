/**
 * Single source of truth para a UI sobre estados de Orçamento (N.O.N.).
 *
 * Espelha backend/src/domain/orcamentoStatus.js + orcamentoStatusMachine.js.
 * Qualquer mudança de estado precisa ser espelhada aqui e vice-versa.
 *
 * Specs: specs/crm-non.md | Plan: validated-swimming-otter.md
 */

export const OrcamentoStatus = Object.freeze({
  NOVA: 'Nova O.N.',
  NAO_RESPONDE: 'Não Responde',
  STANDBY: 'Standby',
  CANCELADO: 'Cancelado',
});

/**
 * Ordem canônica para dropdowns / listas.
 */
export const STATUS_ORDER = Object.freeze([
  OrcamentoStatus.NOVA,
  OrcamentoStatus.NAO_RESPONDE,
  OrcamentoStatus.STANDBY,
  OrcamentoStatus.CANCELADO,
]);

/**
 * Motivos canônicos de cancelamento (5 valores enumerados).
 */
export const MOTIVOS_CANCELAMENTO = Object.freeze([
  'Desistiu de realizar a compra',
  'Não Responde',
  'Comprou na concorrência',
  'Comprou móveis convencionais',
  'O perfil não se encaixa com o produto',
]);

/**
 * Paleta para OrcamentoStatusBadge — classes Tailwind (bg + text + border + dot).
 */
export const STATUS_COLORS = Object.freeze({
  [OrcamentoStatus.NOVA]: {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    dot: 'bg-sky-500',
  },
  [OrcamentoStatus.NAO_RESPONDE]: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  [OrcamentoStatus.STANDBY]: {
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
    dot: 'bg-violet-500',
  },
  [OrcamentoStatus.CANCELADO]: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
  },
});

export function isTerminalStatus(status) {
  return status === OrcamentoStatus.CANCELADO;
}

/**
 * Retorna transições válidas via endpoint PUT /orcamentos/:id/status.
 * Cancelamento e reativação usam endpoints dedicados e NÃO aparecem aqui.
 *
 * Espelha backend/src/services/orcamentoStatusMachine.js#validateTransition.
 */
export function getValidTransitions(fromStatus) {
  if (fromStatus === OrcamentoStatus.CANCELADO) return [];
  const NON_TERMINAL = [OrcamentoStatus.NOVA, OrcamentoStatus.NAO_RESPONDE, OrcamentoStatus.STANDBY];
  if (!NON_TERMINAL.includes(fromStatus)) return [];
  return NON_TERMINAL.filter((s) => s !== fromStatus);
}
