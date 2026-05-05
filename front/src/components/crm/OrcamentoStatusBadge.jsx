import { STATUS_COLORS } from '@/lib/orcamentoStatus';

/**
 * Pill colorido do status de Orçamento.
 *
 * Props:
 *  - status: string (um dos OrcamentoStatus canônicos)
 *  - size: 'xs' | 'sm' (default 'sm')
 *  - showDot: boolean (default true)
 *
 * Specs: specs/crm-non.md
 */
export default function OrcamentoStatusBadge({ status, size = 'sm', showDot = true }) {
  const palette = STATUS_COLORS[status];

  if (!palette) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-sm font-bold bg-(--surface-3) text-(--text-secondary) border border-(--border)">
        {status || '—'}
      </span>
    );
  }

  const sizeClasses = size === 'xs'
    ? 'text-sm px-1.5 py-0.5'
    : 'text-sm px-2 py-0.5';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold border tracking-tight ${sizeClasses} ${palette.bg} ${palette.text} ${palette.border}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${palette.dot}`} aria-hidden />}
      {status}
    </span>
  );
}
