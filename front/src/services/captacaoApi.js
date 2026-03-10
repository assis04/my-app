import { api } from './api';

export const getQueue = async (branchId) => {
  const response = await api(`/api/captacao/queue/${branchId}`);
  return response; // A função api() já retorna o `data` processado do JSON
};

export const createQuickLead = async (branchId, leadData) => {
  const response = await api('/api/captacao/lead/quick', {
    body: {
      branch_id: branchId,
      ...leadData
    }
  });
  return response;
};

export const createManualLead = async (leadData) => {
  const response = await api('/api/captacao/lead/manual', {
    body: leadData
  });
  return response;
};

export const toggleAvailability = async (branchId, isAvailable) => {
  const response = await api('/api/captacao/queue/toggle-status', {
    method: 'PUT',
    body: {
      branch_id: branchId,
      is_available: isAvailable
    }
  });
  return response;
};

export const getLeadHistory = async (branchId) => {
  const response = await api(`/api/captacao/history?branch_id=${branchId}`);
  return response;
};
