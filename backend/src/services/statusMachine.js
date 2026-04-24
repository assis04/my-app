/**
 * Máquina de estados de Lead — módulo puro, sem dependências de DB ou framework.
 *
 * Fonte de verdade: specs/crm.md §7 (Status do Lead — máquina de estados)
 *                   specs/crm-plan.md §2.1 e §2.2
 *
 * Responsabilidade ÚNICA: dado (statusAtual, statusDesejado), decidir se é
 * transição válida e quais side-effects devem ser disparados. NÃO executa
 * nada — só devolve descritores. Quem executa é o leadTransitionService
 * (Task #8) dentro de uma transação.
 */

import {
  LeadStatus,
  isValidStatus,
  isTerminalStatus,
  getEtapaForStatus,
  requiresAdminToEdit,
} from '../domain/leadStatus.js';

/**
 * Tipos de side-effect declarativos. O orquestrador (leadTransitionService)
 * sabe como executar cada um.
 */
export const SideEffectType = Object.freeze({
  /** Abre tela/job da Agenda para o tipo correspondente ao status destino. */
  AGENDA_OPEN: 'agenda_open',
  /** Preenche statusAntesCancelamento + canceladoEm (usado ao cancelar). */
  SET_CANCEL_FIELDS: 'set_cancel_fields',
  // NON_OPEN_OR_CREATE removido — Orçamento é uma entidade separada (specs/crm-non.md)
  // criada explicitamente pelo vendedor via POST /api/crm/orcamentos.
  // Transições de Lead não disparam mais criação/abertura de Orçamento.
});

/**
 * Transições NORMAIS permitidas (via endpoint PUT /leads/:id/status).
 * Cancelamento usa endpoint dedicado (/cancel), reativação idem (/reactivate).
 *
 * Regras derivadas da spec §7:
 * - Estados intermediários transicionam livremente entre si e para estados terminais
 * - "Cancelado" é saída exclusiva pelo endpoint /cancel OU /reactivate
 * - "Venda" só transiciona para "Pós-venda" ou "Cancelado"
 * - "Pós-venda" só transiciona para "Cancelado"
 * - "Pós-venda" exige passagem prévia por "Venda" (não pode vir de intermediário)
 * - Transição para o mesmo status é inválida (no-op)
 */
const INTERMEDIATE_STATUSES = Object.freeze([
  LeadStatus.EM_PROSPECCAO,
  LeadStatus.AGUARDANDO_PLANTA,
  LeadStatus.AGENDADO_VIDEO,
  LeadStatus.AGENDADO_VISITA,
  LeadStatus.EM_ATENDIMENTO_LOJA,
]);

function isIntermediate(status) {
  return INTERMEDIATE_STATUSES.includes(status);
}

/**
 * Valida uma transição de status.
 *
 * @param {string} from - status atual
 * @param {string} to - status desejado
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

  // Cancelado: sai apenas pelo fluxo de Reativação (endpoint dedicado).
  if (from === LeadStatus.CANCELADO) {
    return {
      allowed: false,
      reason: 'Lead cancelado só pode sair desse estado via endpoint de reativação (/reactivate).',
    };
  }

  // Venda: só para Pós-venda ou Cancelado.
  if (from === LeadStatus.VENDA) {
    if (to === LeadStatus.POS_VENDA || to === LeadStatus.CANCELADO) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `De "Venda" só é permitido ir para "Pós-venda" ou "Cancelado". Recebido: "${to}".`,
    };
  }

  // Pós-venda: só para Cancelado (caso raro de cancelamento de venda).
  if (from === LeadStatus.POS_VENDA) {
    if (to === LeadStatus.CANCELADO) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `De "Pós-venda" só é permitido ir para "Cancelado". Recebido: "${to}".`,
    };
  }

  // Pós-venda só pode vir de Venda.
  if (to === LeadStatus.POS_VENDA && from !== LeadStatus.VENDA) {
    return {
      allowed: false,
      reason: 'Para chegar em "Pós-venda" o Lead precisa passar por "Venda" primeiro.',
    };
  }

  // Estados intermediários: qualquer destino é permitido (exceto os já tratados).
  if (isIntermediate(from)) {
    return { allowed: true };
  }

  // Fallback defensivo — não deve acontecer se os enums estão corretos.
  return { allowed: false, reason: `Transição não mapeada: "${from}" → "${to}".` };
}

/**
 * Retorna side-effects a serem disparados ao entrar no status `to`.
 * Não inclui os side-effects "sempre-ligados" (mover KanbanCard, registrar
 * status_changed no Histórico, atualizar etapa) — esses são aplicados
 * incondicionalmente pelo orquestrador em toda transição.
 *
 * @param {string} to - status destino
 * @param {object} context - dados opcionais (motivo, dataHora, etc.) que o orquestrador repassa
 * @returns {Array<{ type: string, payload: object }>}
 */
export function getSideEffects(to, context = {}) {
  if (!isValidStatus(to)) {
    throw new Error(`Status inválido: "${to}"`);
  }

  switch (to) {
    case LeadStatus.AGUARDANDO_PLANTA:
      return [
        {
          type: SideEffectType.AGENDA_OPEN,
          payload: { tipo: 'coleta_planta_medidas', dataHora: context.dataHora ?? null },
        },
      ];

    case LeadStatus.AGENDADO_VIDEO:
      return [
        {
          type: SideEffectType.AGENDA_OPEN,
          payload: { tipo: 'video_chamada', dataHora: context.dataHora ?? null },
        },
      ];

    case LeadStatus.AGENDADO_VISITA:
      return [
        {
          type: SideEffectType.AGENDA_OPEN,
          payload: { tipo: 'visita_loja', dataHora: context.dataHora ?? null },
        },
      ];

    case LeadStatus.CANCELADO:
      return [
        {
          type: SideEffectType.SET_CANCEL_FIELDS,
          payload: { reason: context.reason ?? null },
        },
      ];

    // Em prospecção, Em Atendimento Loja, Venda, Pós-venda: nenhum side-effect extra
    // (somente as ações sempre-ligadas aplicadas pelo orquestrador).
    default:
      return [];
  }
}

/**
 * Helper conveniente — expõe utilidades de leadStatus.js num ponto único
 * para quem consome a máquina de estados. Não duplica lógica; só reencaminha.
 */
export const statusMachine = Object.freeze({
  validateTransition,
  getSideEffects,
  getEtapaForStatus,
  isTerminal: isTerminalStatus,
  requiresAdminToEdit,
});
