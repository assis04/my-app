/**
 * Constantes e helpers compartilhados do formulário de Leads CRM.
 * Usado em: leads/page.jsx (modal), leads/novo/page.jsx, leads/[id]/page.jsx
 */

export const STATUS_OPTIONS = [
  { id: 'Prospecção', nome: 'Prospecção' },
  { id: 'Qualificação', nome: 'Qualificação' },
  { id: 'Apresentação', nome: 'Apresentação' },
  { id: 'Negociação', nome: 'Negociação' },
  { id: 'Fechado', nome: 'Fechado' },
  { id: 'Perdido', nome: 'Perdido' },
];

export const ETAPA_OPTIONS = [
  { id: 'Vídeo Chamada', nome: 'Vídeo Chamada' },
  { id: 'Visita à Loja', nome: 'Visita à Loja' },
  { id: 'Agendamento', nome: 'Agendamento' },
  { id: 'Follow-up', nome: 'Follow-up' },
  { id: 'Proposta Enviada', nome: 'Proposta Enviada' },
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
  status: 'Em prospecção',
  etapa: '',
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
