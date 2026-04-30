import { api } from './api';

export const getQueue = async (branchId) => {
  const response = await api(`/api/crm/queue/${branchId}`);
  return response; // A função api() já retorna o `data` processado do JSON
};

export const createQuickLead = async (branchId, leadData) => {
  const isFormData = leadData instanceof FormData;
  const body = isFormData ? leadData : { branch_id: branchId, ...leadData };
  
  const response = await api('/api/crm/lead/quick', {
    body: body
  });
  return response;
};

export const createManualLead = async (leadData) => {
  const response = await api('/api/crm/lead/manual', {
    body: leadData
  });
  return response;
};

export const toggleAvailability = async (branchId, isAvailable, userId = null) => {
  const response = await api('/api/crm/queue/toggle-status', {
    method: 'PUT',
    body: {
      branch_id: branchId,
      is_available: isAvailable,
      user_id: userId
    }
  });
  return response;
};

export const getQueueHistory = async (branchId) => {
  const response = await api(`/api/crm/history?branch_id=${branchId}`);
  return response;
};

// ─── Leads CRM (entidade Lead dedicada) ──────────────────────────────────

export const getLeads = async ({ search, status, preVendedorId, page, limit } = {}) => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (status) params.append('status', status);
  if (preVendedorId) params.append('pre_vendedor_id', preVendedorId);
  if (page) params.append('page', page);
  if (limit) params.append('limit', limit);
  return api(`/api/crm/leads?${params.toString()}`);
};

/**
 * Lista contas com filtros. Backend aceita combinações em AND.
 * @param {object} [filters]
 * @param {string} [filters.search]     — busca textual ampla (nome/sobrenome/celular/CEP)
 * @param {string} [filters.nome]       — contains em nome OU sobrenome (estruturado)
 * @param {string} [filters.telefone]   — contains em celular (digits-only)
 * @param {string} [filters.status]     — Account tem lead com esse status
 * @param {string|number} [filters.filialId]
 * @param {string|number} [filters.userId]
 * @param {string} [filters.dataInicio] — ISO datetime, account.createdAt >= X
 * @param {string} [filters.dataFim]    — ISO datetime, account.createdAt <= X
 */
export const getAccounts = async (filters = {}) => {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
  }
  const qs = params.toString();
  return api(`/api/crm/accounts${qs ? `?${qs}` : ''}`);
};

export const getLeadById = async (id) => {
  return api(`/api/crm/leads/${id}`);
};

export const createLead = async (data) => {
  return api('/api/crm/leads', { body: data });
};

export const updateLead = async (id, data) => {
  return api(`/api/crm/leads/${id}`, { method: 'PUT', body: data });
};

export const deleteLead = async (id) => {
  return api(`/api/crm/leads/${id}`, { method: 'DELETE' });
};

export const transferLeads = async (leadIds, preVendedorId) => {
  return api('/api/crm/leads-transfer', { method: 'PUT', body: { leadIds, preVendedorId } });
};

export const updateEtapaLote = async (leadIds, etapa) => {
  return api('/api/crm/leads-etapa', { method: 'PUT', body: { leadIds, etapa } });
};

// ─── Transições de status / temperatura / cancel / reactivate (Tasks #9–#13) ──
// Contratos: specs/crm.md §4.2–§4.6. Endpoints dedicados — PUT /leads/:id genérico
// NÃO aceita mudança de status/etapa (Guard 1 de updateLead).

/**
 * Dispara uma transição de status via state machine do backend.
 * @param {number|string} id
 * @param {{ status: string, motivo?: string, contexto?: { agendadoPara?: string } }} payload
 * @returns {Promise<{ lead, kanbanCard, historyEvent, outboxEvents: Array }>}
 */
export const transitionLeadStatus = async (id, { status, motivo, contexto } = {}) => {
  return api(`/api/crm/leads/${id}/status`, {
    method: 'PUT',
    body: { status, motivo, contexto: contexto || {} },
  });
};

/**
 * Atualiza temperatura (Muito interessado | Interessado | Sem interesse).
 * Backend retorna changed:false se valor não mudou (UI não precisa exibir toast).
 * @param {number|string} id
 * @param {'Muito interessado' | 'Interessado' | 'Sem interesse'} temperatura
 * @returns {Promise<{ lead, historyEvent, changed: boolean }>}
 */
export const setLeadTemperatura = async (id, temperatura) => {
  return api(`/api/crm/leads/${id}/temperatura`, {
    method: 'PUT',
    body: { temperatura },
  });
};

/**
 * Cancela um lead. Motivo obrigatório (min 1 char, max 1000).
 * @param {number|string} id
 * @param {string} motivo
 * @returns {Promise<{ lead, kanbanCard, historyEvent, outboxEvents: Array }>}
 */
export const cancelLead = async (id, motivo) => {
  return api(`/api/crm/leads/${id}/cancel`, {
    method: 'PUT',
    body: { motivo },
  });
};

/**
 * Reativa um lead cancelado. Dois modos:
 *  - 'reativar' (200): restaura o próprio lead para status anterior
 *  - 'novo'     (201): preserva o lead cancelado, cria novo lead no mesmo Account
 * @param {number|string} id
 * @param {{ modo: 'reativar' | 'novo', motivo?: string }} payload
 */
export const reactivateLead = async (id, { modo, motivo } = {}) => {
  return api(`/api/crm/leads/${id}/reactivate`, {
    method: 'PUT',
    body: { modo, motivo: motivo || '' },
  });
};

/**
 * Busca histórico paginado de eventos do lead.
 * @param {number|string} id
 * @param {{ cursor?: string, limit?: number }} opts
 * @returns {Promise<{ items: Array, nextCursor: string | null }>}
 */
export const getLeadHistory = async (id, { cursor, limit } = {}) => {
  const params = new URLSearchParams();
  if (cursor) params.append('cursor', cursor);
  if (limit) params.append('limit', String(limit));
  const qs = params.toString();
  return api(`/api/crm/leads/${id}/history${qs ? `?${qs}` : ''}`);
};

// ─── Orçamentos (N.O.N.) — entidade separada vinculada 1:1 ao Lead ────────
// Contratos: specs/crm-non.md

/**
 * Lista Orçamentos (paginada, com filtros de nome/telefone/status/filialId/userId/data).
 * @param {object} [filters]
 * @returns {Promise<{ data, total, page, limit, totalPages }>}
 */
export const getOrcamentos = async (filters = {}) => {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
  }
  const qs = params.toString();
  return api(`/api/crm/orcamentos${qs ? `?${qs}` : ''}`);
};

/**
 * Detalhe de um Orçamento por id (inclui lead + criadoPor).
 */
export const getOrcamentoById = async (id) => {
  return api(`/api/crm/orcamentos/${id}`);
};

/**
 * Shortcut: retorna o Orçamento vinculado ao Lead (404 se não houver).
 */
export const getOrcamentoByLeadId = async (leadId) => {
  return api(`/api/crm/leads/${leadId}/orcamento`);
};

/**
 * Cria um Orçamento vinculado a um Lead. Backend força status inicial "Nova O.N."
 * @returns {Promise<Orcamento>}
 */
export const createOrcamento = async (leadId) => {
  return api('/api/crm/orcamentos', { body: { leadId } });
};

/**
 * Transita status do Orçamento (apenas entre não-terminais: Nova O.N. / Não Responde / Standby).
 * Para cancelar/reativar, use endpoints dedicados.
 */
export const transitionOrcamentoStatus = async (id, status) => {
  return api(`/api/crm/orcamentos/${id}/status`, {
    method: 'PUT',
    body: { status },
  });
};

/**
 * Cancela um Orçamento. Motivo obrigatório entre os 5 valores canônicos.
 */
export const cancelOrcamento = async (id, motivo) => {
  return api(`/api/crm/orcamentos/${id}/cancel`, {
    method: 'PUT',
    body: { motivo },
  });
};

/**
 * Reativa um Orçamento cancelado — volta para Nova O.N., limpa motivo.
 */
export const reactivateOrcamento = async (id) => {
  return api(`/api/crm/orcamentos/${id}/reactivate`, {
    method: 'PUT',
    body: {},
  });
};
