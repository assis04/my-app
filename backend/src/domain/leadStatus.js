/**
 * Enumerações canônicas de Status e Etapa de Lead.
 *
 * Fonte de verdade: specs/crm.md §7 (Status do Lead — máquina de estados)
 *                   specs/crm-plan.md §2.7 (Enum de Status e Etapa)
 *
 * Regras:
 * - Status é editável via transição validada (statusMachine).
 * - Etapa é SEMPRE derivada do Status via STATUS_TO_ETAPA — nunca editável manualmente.
 * - Enums ficam em código, não no Postgres, pra facilitar evolução.
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

export const LeadEtapa = Object.freeze({
  PROSPECCAO: 'Prospecção',
  NEGOCIACAO: 'Negociação',
  VENDA: 'Venda',
  POS_VENDA: 'Pós-venda',
  CANCELADOS: 'Cancelados',
});

/**
 * Mapeamento canônico Status → Etapa.
 * Usar sempre via getEtapaForStatus() em vez de acessar direto.
 */
export const STATUS_TO_ETAPA = Object.freeze({
  [LeadStatus.EM_PROSPECCAO]: LeadEtapa.PROSPECCAO,
  [LeadStatus.AGUARDANDO_PLANTA]: LeadEtapa.PROSPECCAO,
  [LeadStatus.AGENDADO_VIDEO]: LeadEtapa.NEGOCIACAO,
  [LeadStatus.AGENDADO_VISITA]: LeadEtapa.NEGOCIACAO,
  [LeadStatus.EM_ATENDIMENTO_LOJA]: LeadEtapa.NEGOCIACAO,
  [LeadStatus.VENDA]: LeadEtapa.VENDA,
  [LeadStatus.POS_VENDA]: LeadEtapa.POS_VENDA,
  [LeadStatus.CANCELADO]: LeadEtapa.CANCELADOS,
});

const ALL_STATUSES = Object.freeze(Object.values(LeadStatus));
const ALL_ETAPAS = Object.freeze(Object.values(LeadEtapa));

export function getAllStatuses() {
  return ALL_STATUSES;
}

export function getAllEtapas() {
  return ALL_ETAPAS;
}

export function isValidStatus(value) {
  return ALL_STATUSES.includes(value);
}

export function isValidEtapa(value) {
  return ALL_ETAPAS.includes(value);
}

/**
 * Retorna a Etapa correspondente a um Status. Lança se o status for inválido.
 */
export function getEtapaForStatus(status) {
  if (!isValidStatus(status)) {
    throw new Error(`Status inválido: "${status}"`);
  }
  return STATUS_TO_ETAPA[status];
}

/**
 * Estados terminais: "Venda", "Pós-venda" e "Cancelado".
 * Venda/Pós-venda só transicionam pra Cancelado (se venda for cancelada).
 * Cancelado só sai via fluxo de Reativação (§6.5 da spec).
 */
export function isTerminalStatus(status) {
  return (
    status === LeadStatus.VENDA ||
    status === LeadStatus.POS_VENDA ||
    status === LeadStatus.CANCELADO
  );
}

/**
 * Após Venda/Pós-venda o Lead é read-only para todos exceto ADM com
 * permissão `crm:leads:edit-after-sale` (spec §9.14 / plan §2.8).
 */
export function requiresAdminToEdit(status) {
  return status === LeadStatus.VENDA || status === LeadStatus.POS_VENDA;
}

/**
 * Status inicial de qualquer Lead novo, inclusive reativação sem histórico.
 */
export const INITIAL_STATUS = LeadStatus.EM_PROSPECCAO;
