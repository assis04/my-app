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
 * Cada status tem identidade visual distinta:
 *  - Nova: gold sólido (acabou de chegar, alta atenção)
 *  - Não Responde: gold ghost (aguardando, warm)
 *  - Standby: surface-3 muted (pausado, frio)
 *  - Cancelado: danger ghost (terminal negativo)
 */
export const STATUS_COLORS = Object.freeze({
  [OrcamentoStatus.NOVA]: {
    bg: 'bg-(--gold)',
    text: 'text-(--on-gold)',
    border: 'border-(--gold-hover)',
    dot: 'bg-(--on-gold)',
  },
  [OrcamentoStatus.NAO_RESPONDE]: {
    bg: 'bg-(--gold-soft)',
    text: 'text-(--gold-hover)',
    border: 'border-(--gold)/30',
    dot: 'bg-(--gold-hover)',
  },
  [OrcamentoStatus.STANDBY]: {
    bg: 'bg-(--surface-3)',
    text: 'text-(--text-muted)',
    border: 'border-(--border)',
    dot: 'bg-(--text-muted)',
  },
  [OrcamentoStatus.CANCELADO]: {
    bg: 'bg-(--danger-soft)',
    text: 'text-(--danger)',
    border: 'border-(--danger)/40',
    dot: 'bg-(--danger)',
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
