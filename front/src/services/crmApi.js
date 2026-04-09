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

export const getLeadHistory = async (branchId) => {
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

export const getAccounts = async ({ search, page, limit } = {}) => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (page) params.append('page', page);
  if (limit) params.append('limit', limit);
  return api(`/api/crm/accounts?${params.toString()}`);
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
