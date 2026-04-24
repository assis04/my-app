/**
 * Single source of truth para a UI sobre a máquina de estados de Lead.
 *
 * Espelha o backend: backend/src/domain/leadStatus.js + services/statusMachine.js.
 * Qualquer mudança de estado precisa ser espelhada aqui e vice-versa.
 *
 * Spec: specs/crm.md §7 | Plan: specs/crm-frontend-plan.md §2.4
 */

export const LeadStatus = Object.freeze({
  EM_PROSPECCAO: 'Em prospecção',
  AGUARDANDO_PLANTA: 'Aguardando Planta/medidas',
  AGENDADO_VIDEO: 'Agendado vídeo chamada',
  AGENDADO_VISITA: 'Agendado visita na loja',
  EM_ATENDIMENTO_LOJA: 'Em Atendimento Loja',
  VENDA: 'Venda',
  POS_VENDA: 'Pós-venda',
  CANCELADO: 'Cancelado',
});

/**
 * Ordem canônica para dropdowns / listas. Não é a ordem da jornada — é a ordem
 * de apresentação (intermediários primeiro, terminais por último).
 */
export const STATUS_ORDER = Object.freeze([
  LeadStatus.EM_PROSPECCAO,
  LeadStatus.AGUARDANDO_PLANTA,
  LeadStatus.AGENDADO_VIDEO,
  LeadStatus.AGENDADO_VISITA,
  LeadStatus.EM_ATENDIMENTO_LOJA,
  LeadStatus.VENDA,
  LeadStatus.POS_VENDA,
  LeadStatus.CANCELADO,
]);

/**
 * Paleta para LeadStatusBadge. Classes Tailwind (bg + text + border).
 * Mantém consistência visual entre list, detail e timeline.
 */
export const STATUS_COLORS = Object.freeze({
  [LeadStatus.EM_PROSPECCAO]: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
  },
  [LeadStatus.AGUARDANDO_PLANTA]: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  [LeadStatus.AGENDADO_VIDEO]: {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    dot: 'bg-sky-500',
  },
  [LeadStatus.AGENDADO_VISITA]: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    dot: 'bg-indigo-500',
  },
  [LeadStatus.EM_ATENDIMENTO_LOJA]: {
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
    dot: 'bg-violet-500',
  },
  [LeadStatus.VENDA]: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  [LeadStatus.POS_VENDA]: {
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
    dot: 'bg-teal-500',
  },
  [LeadStatus.CANCELADO]: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
  },
});

/**
 * Statuses que exigem `contexto.agendadoPara` (ISO 8601 com offset) ao
 * transicionar. Baseado em statusMachine.getSideEffects.
 */
export const STATUSES_REQUIRING_DATETIME = Object.freeze([
  LeadStatus.AGUARDANDO_PLANTA,
  LeadStatus.AGENDADO_VIDEO,
  LeadStatus.AGENDADO_VISITA,
]);

/**
 * Estados terminais — Venda, Pós-venda, Cancelado.
 */
export function isTerminalStatus(status) {
  return (
    status === LeadStatus.VENDA ||
    status === LeadStatus.POS_VENDA ||
    status === LeadStatus.CANCELADO
  );
}

/**
 * Venda e Pós-venda exigem permissão `crm:leads:edit-after-sale` para edição.
 */
export function requiresAdminToEdit(status) {
  return status === LeadStatus.VENDA || status === LeadStatus.POS_VENDA;
}

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
 * Retorna lista de transições válidas via endpoint PUT /leads/:id/status.
 * Cancelamento e reativação usam endpoints dedicados e NÃO aparecem aqui.
 *
 * Espelha backend/src/services/statusMachine.js#validateTransition.
 *
 * @param {string} fromStatus
 * @returns {string[]} array de statuses destino permitidos
 */
export function getValidTransitions(fromStatus) {
  // Cancelado sai apenas via /reactivate — não tem transições via /status.
  if (fromStatus === LeadStatus.CANCELADO) return [];

  // Venda: só para Pós-venda ou Cancelado. Cancelado vai pelo /cancel.
  if (fromStatus === LeadStatus.VENDA) {
    return [LeadStatus.POS_VENDA];
  }

  // Pós-venda: só cancela — vai pelo /cancel. Sem transições via /status.
  if (fromStatus === LeadStatus.POS_VENDA) {
    return [];
  }

  // Intermediários: podem ir para qualquer outro (exceto si mesmo, Pós-venda,
  // e Cancelado que usa /cancel). Pós-venda só de Venda.
  if (isIntermediate(fromStatus)) {
    return STATUS_ORDER.filter(
      (s) =>
        s !== fromStatus &&
        s !== LeadStatus.CANCELADO &&
        s !== LeadStatus.POS_VENDA,
    );
  }

  return [];
}
