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

/**
 * Validação form-level legacy — retorna a primeira mensagem ou null.
 * Mantida por compatibilidade. Em telas novas, prefira validateLeadFormFields.
 */
export function validateLeadForm(form) {
  const errors = validateLeadFormFields(form);
  const first = Object.values(errors)[0];
  return first || null;
}

/**
 * Validação por campo — retorna map { fieldName: 'erro' } só com chaves
 * dos campos inválidos. Permite UX inline (erro no campo, não global).
 *
 * Email não é obrigatório, mas se preenchido valida formato básico.
 */
export function validateLeadFormFields(form) {
  const errors = {};

  if (!form.nome?.trim()) {
    errors.nome = 'Nome é obrigatório.';
  } else if (form.nome.trim().length < 2) {
    errors.nome = 'Nome deve ter pelo menos 2 caracteres.';
  }

  const celularDigits = (form.celular || '').replace(/\D/g, '');
  if (!celularDigits) {
    errors.celular = 'Celular é obrigatório.';
  } else if (celularDigits.length < 10) {
    errors.celular = 'Celular deve ter pelo menos 10 dígitos.';
  }

  const cepDigits = (form.cep || '').replace(/\D/g, '');
  if (!cepDigits) {
    errors.cep = 'CEP é obrigatório.';
  } else if (cepDigits.length < 8) {
    errors.cep = 'CEP deve ter 8 dígitos.';
  }

  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Formato de e-mail inválido.';
  }

  if (form.conjugeEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.conjugeEmail.trim())) {
    errors.conjugeEmail = 'Formato de e-mail inválido.';
  }

  return errors;
}
