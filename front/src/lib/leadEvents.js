/**
 * Mapa de ícones + renderers para eventos do LeadHistory.
 *
 * Espelha backend/src/domain/leadEvents.js. Payloads esperados seguem
 * PAYLOAD_SHAPES do backend.
 *
 * Spec: specs/crm.md §4.4 | Plan: specs/crm-frontend-plan.md §2.3
 */

import {
  ArrowRight,
  Thermometer,
  UserCog,
  Calendar,
  XCircle,
  RefreshCw,
  Pencil,
  Globe,
  Briefcase,
  GitBranch,
} from 'lucide-react';

export const LeadEventType = Object.freeze({
  STATUS_CHANGED: 'status_changed',
  TEMPERATURA_CHANGED: 'temperatura_changed',
  VENDEDOR_TRANSFERRED: 'vendedor_transferred',
  PREVENDEDOR_TRANSFERRED: 'prevendedor_transferred',
  AGENDA_SCHEDULED: 'agenda_scheduled',
  NON_GENERATED: 'non_generated',
  LEAD_CANCELLED: 'lead_cancelled',
  LEAD_REACTIVATED: 'lead_reactivated',
  REACTIVATED_AS_NEW_LEAD: 'reactivated_as_new_lead',
  CREATED_FROM_REACTIVATION: 'created_from_reactivation',
  NOTE_ADDED: 'note_added',
  EXTERNAL_CREATED: 'external_created',
});

/**
 * Ícone + classe de cor (Tailwind) para cada tipo de evento.
 * Cor do ícone reflete a tonalidade emocional do evento (sucesso/ação/negativo).
 */
export const EVENT_ICONS = Object.freeze({
  [LeadEventType.STATUS_CHANGED]: { Icon: ArrowRight, color: 'text-sky-500' },
  [LeadEventType.TEMPERATURA_CHANGED]: { Icon: Thermometer, color: 'text-amber-500' },
  [LeadEventType.VENDEDOR_TRANSFERRED]: { Icon: UserCog, color: 'text-violet-500' },
  [LeadEventType.PREVENDEDOR_TRANSFERRED]: { Icon: UserCog, color: 'text-violet-500' },
  [LeadEventType.AGENDA_SCHEDULED]: { Icon: Calendar, color: 'text-indigo-500' },
  [LeadEventType.NON_GENERATED]: { Icon: Briefcase, color: 'text-emerald-500' },
  [LeadEventType.LEAD_CANCELLED]: { Icon: XCircle, color: 'text-rose-500' },
  [LeadEventType.LEAD_REACTIVATED]: { Icon: RefreshCw, color: 'text-emerald-500' },
  [LeadEventType.REACTIVATED_AS_NEW_LEAD]: { Icon: GitBranch, color: 'text-emerald-500' },
  [LeadEventType.CREATED_FROM_REACTIVATION]: { Icon: GitBranch, color: 'text-sky-500' },
  [LeadEventType.NOTE_ADDED]: { Icon: Pencil, color: 'text-slate-500' },
  [LeadEventType.EXTERNAL_CREATED]: { Icon: Globe, color: 'text-slate-500' },
});

/**
 * Gera o TEXTO principal de cada evento a partir do payload.
 * Retorna string (o componente timeline envolve em JSX).
 */
export const EVENT_TITLES = Object.freeze({
  [LeadEventType.STATUS_CHANGED]: (p) => `Status alterado: ${p.from || '—'} → ${p.to || '—'}`,
  [LeadEventType.TEMPERATURA_CHANGED]: (p) => `Temperatura: ${p.from || '—'} → ${p.to || '—'}`,
  [LeadEventType.VENDEDOR_TRANSFERRED]: (p) =>
    `Vendedor transferido${p.reason ? ` — ${p.reason}` : ''}`,
  [LeadEventType.PREVENDEDOR_TRANSFERRED]: (p) =>
    `Pré-vendedor transferido${p.reason ? ` — ${p.reason}` : ''}`,
  [LeadEventType.AGENDA_SCHEDULED]: (p) => `Agendado: ${p.tipo || 'evento'}`,
  [LeadEventType.NON_GENERATED]: () => 'Oportunidade de Negócio gerada',
  [LeadEventType.LEAD_CANCELLED]: (p) => `Lead cancelado${p.reason ? ` — ${p.reason}` : ''}`,
  [LeadEventType.LEAD_REACTIVATED]: () => 'Lead reativado',
  [LeadEventType.REACTIVATED_AS_NEW_LEAD]: (p) =>
    `Reativado como novo lead${p.newLeadId ? ` #${p.newLeadId}` : ''}`,
  [LeadEventType.CREATED_FROM_REACTIVATION]: (p) =>
    `Criado a partir de lead cancelado${p.sourceLeadId ? ` #${p.sourceLeadId}` : ''}`,
  [LeadEventType.NOTE_ADDED]: (p) => p.text || 'Nota adicionada',
  [LeadEventType.EXTERNAL_CREATED]: (p) => `Lead criado via ${p.source || 'fonte externa'}`,
});

/**
 * Helper — gera título e ícone pra um evento do histórico.
 */
export function renderEvent(event) {
  const type = event?.eventType;
  const payload = event?.payload || {};
  const icon = EVENT_ICONS[type] || { Icon: Pencil, color: 'text-slate-400' };
  const titleFn = EVENT_TITLES[type];
  const title = titleFn ? titleFn(payload) : type || 'Evento';
  return { Icon: icon.Icon, color: icon.color, title };
}
