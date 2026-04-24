/**
 * Máquina de estados de Orçamento (N.O.N.) — módulo puro, sem DB.
 *
 * Fonte de verdade: specs/crm-non.md + plans/validated-swimming-otter.md
 *
 * Responsabilidade: dado (statusAtual, statusDesejado), decidir se é transição
 * válida via endpoint /status. Cancelamento e reativação são fluxos dedicados
 * (endpoints /cancel e /reactivate) e NÃO passam por esta validação.
 *
 * V1 não tem side-effects — vendedor controla tudo manualmente.
 */

import {
  OrcamentoStatus,
  isValidStatus,
  isTerminalStatus,
} from '../domain/orcamentoStatus.js';

const NON_TERMINAL_STATUSES = Object.freeze([
  OrcamentoStatus.NOVA,
  OrcamentoStatus.NAO_RESPONDE,
  OrcamentoStatus.STANDBY,
]);

/**
 * Valida uma transição via endpoint /status.
 * Cancelado é alcançado APENAS via /cancel; sair dele APENAS via /reactivate.
 *
 * @param {string} from
 * @param {string} to
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function validateTransition(from, to) {
  if (!isValidStatus(from)) {
    return { allowed: false, reason: `Status de origem inválido: "${from}"` };
  }
  if (!isValidStatus(to)) {
    return { allowed: false, reason: `Status de destino inválido: "${to}"` };
  }
  if (from === to) {
    return { allowed: false, reason: 'Transição para o mesmo status não é permitida.' };
  }

  // Cancelado: entrada e saída usam endpoints dedicados, não este.
  if (to === OrcamentoStatus.CANCELADO) {
    return {
      allowed: false,
      reason: 'Cancelamento usa o endpoint /cancel (com motivo obrigatório).',
    };
  }
  if (from === OrcamentoStatus.CANCELADO) {
    return {
      allowed: false,
      reason: 'Orçamento cancelado só pode sair desse estado via endpoint /reactivate.',
    };
  }

  // Estados não-terminais: livres entre si.
  if (NON_TERMINAL_STATUSES.includes(from) && NON_TERMINAL_STATUSES.includes(to)) {
    return { allowed: true };
  }

  // Fallback defensivo — qualquer combinação não coberta acima é inválida.
  return { allowed: false, reason: `Transição não mapeada: "${from}" → "${to}".` };
}

/**
 * Facade congelada — superfície pública limpa pra consumers.
 */
export const orcamentoStatusMachine = Object.freeze({
  validateTransition,
  isTerminal: isTerminalStatus,
});
