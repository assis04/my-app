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
 * Cada status tem identidade visual distinta — não confundir entre si.
 *
 * Hierarquia visual:
 *  - Frio/early (Em prospecção): surface neutra, texto secundário
 *  - Esperando (Aguardando Planta): gold ghost suave
 *  - Agendados (Vídeo, Visita): gold ghost com bordas de intensidade crescente
 *  - Ativo (Em Atendimento Loja): gold sólido — destaque máximo, raro
 *  - Terminal positivo (Venda): success sólido
 *  - Continuação (Pós-venda): success ghost
 *  - Terminal negativo (Cancelado): danger ghost
 */
export const STATUS_COLORS = Object.freeze({
  [LeadStatus.EM_PROSPECCAO]: {
    bg: 'bg-(--surface-3)',
    text: 'text-(--text-secondary)',
    border: 'border-(--border-subtle)',
    dot: 'bg-(--text-faint)',
  },
  [LeadStatus.AGUARDANDO_PLANTA]: {
    bg: 'bg-(--gold-soft)/60',
    text: 'text-(--gold-hover)',
    border: 'border-(--gold)/30',
    dot: 'bg-(--gold-hover)',
  },
  [LeadStatus.AGENDADO_VIDEO]: {
    bg: 'bg-(--gold-soft)',
    text: 'text-(--gold)',
    border: 'border-(--gold)/40',
    dot: 'bg-(--gold)',
  },
  [LeadStatus.AGENDADO_VISITA]: {
    bg: 'bg-(--gold-soft)',
    text: 'text-(--gold)',
    border: 'border-(--gold)',
    dot: 'bg-(--gold)',
  },
  [LeadStatus.EM_ATENDIMENTO_LOJA]: {
    bg: 'bg-(--gold)',
    text: 'text-(--on-gold)',
    border: 'border-(--gold-hover)',
    dot: 'bg-(--on-gold)',
  },
  [LeadStatus.VENDA]: {
    bg: 'bg-(--success)',
    text: 'text-white',
    border: 'border-(--success)',
    dot: 'bg-white',
  },
  [LeadStatus.POS_VENDA]: {
    bg: 'bg-(--success-soft)',
    text: 'text-(--success)',
    border: 'border-(--success)/40',
    dot: 'bg-(--success)',
  },
  [LeadStatus.CANCELADO]: {
    bg: 'bg-(--danger-soft)',
    text: 'text-(--danger)',
    border: 'border-(--danger)/40',
    dot: 'bg-(--danger)',
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
