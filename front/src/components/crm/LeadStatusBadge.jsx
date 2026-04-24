import { STATUS_COLORS } from '@/lib/leadStatus';

/**
 * Pill colorido consistente com o status do lead.
 * Cores definidas em lib/leadStatus.js (single source of truth).
 *
 * Props:
 *  - status: string — um dos LeadStatus canônicos
 *  - size: 'xs' | 'sm' (default 'sm')
 *  - showDot: boolean — exibe bolinha colorida à esquerda (default true)
 *
 * Spec: specs/crm-frontend-plan.md §2.4
 */
export default function LeadStatusBadge({ status, size = 'sm', showDot = true }) {
  const palette = STATUS_COLORS[status];

  // Status desconhecido → pill neutro sem quebrar a UI.
  if (!palette) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
        {status || '—'}
      </span>
    );
  }

  const sizeClasses = size === 'xs'
    ? 'text-[9px] px-1.5 py-0.5'
    : 'text-[10px] px-2 py-0.5';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold border uppercase tracking-tighter ${sizeClasses} ${palette.bg} ${palette.text} ${palette.border}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${palette.dot}`} aria-hidden />}
      {status}
    </span>
  );
}
