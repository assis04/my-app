/**
 * Constantes e helpers compartilhados do formulário de Leads CRM.
 * Usado em: leads/page.jsx (modal), leads/novo/page.jsx, leads/[id]/page.jsx
 *
 * Status e Etapa não são mais editáveis via form. Permanecem aqui como
 * catálogos read-only para filtros e bulk operations na listagem — valores
 * alinhados com o backend domain/leadStatus.js (LeadStatus + LeadEtapa).
 */

import { STATUS_ORDER } from './leadStatus';

/**
 * Apenas para filtros e listagens — não usar em forms de edição.
 * Valores espelham LeadStatus do backend (8 canônicos).
 */
export const STATUS_OPTIONS = STATUS_ORDER.map((s) => ({ id: s, nome: s }));

/**
 * Apenas para filtros e bulk-assignment legado — status é a fonte de verdade.
 * Valores espelham LeadEtapa do backend (5 canônicos).
 */
export const ETAPA_OPTIONS = [
  { id: 'Prospecção', nome: 'Prospecção' },
  { id: 'Negociação', nome: 'Negociação' },
  { id: 'Venda', nome: 'Venda' },
  { id: 'Pós-venda', nome: 'Pós-venda' },
  { id: 'Cancelados', nome: 'Cancelados' },
];

export const CANAL_OPTIONS = [
  { id: 'WhatsApp', nome: 'WhatsApp' },
  { id: 'Formulário', nome: 'Formulário Web' },
  { id: 'Telefone', nome: 'Telefone' },
  { id: 'Presencial', nome: 'Presencial' },
  { id: 'Indicação', nome: 'Indicação' },
  { id: 'Redes Sociais', nome: 'Redes Sociais' },
];

export const INITIAL_LEAD_FORM = {
  nome: '',
  sobrenome: '',
  celular: '',
  email: '',
  cep: '',
  conjugeNome: '',
  conjugeSobrenome: '',
  conjugeCelular: '',
  conjugeEmail: '',
  origemCanal: '',
  preVendedorId: '',
};

export function validateLeadForm(form) {
  if (!form.nome.trim()) return 'Nome é obrigatório.';
  if (!form.celular.replace(/\D/g, '')) return 'Celular é obrigatório.';
  if (form.celular.replace(/\D/g, '').length < 10) return 'Celular deve ter pelo menos 10 dígitos.';
  if (!form.cep.replace(/\D/g, '')) return 'CEP é obrigatório.';
  if (form.cep.replace(/\D/g, '').length < 8) return 'CEP deve ter 8 dígitos.';
  return null;
}
