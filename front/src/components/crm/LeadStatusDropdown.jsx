'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import LeadStatusBadge from './LeadStatusBadge';
import StatusTransitionModal from './StatusTransitionModal';
import { getValidTransitions } from '@/lib/leadStatus';

/**
 * Wrapper que exibe o badge de status atual + botão para abrir o modal de transição.
 *
 * Props:
 *  - status: string
 *  - onTransition: (payload) => Promise<void>
 *  - submitting: boolean
 *  - disabled: boolean (ex: pós-venda sem permissão)
 *
 * Spec: specs/crm.md §4.2 | Plan: specs/crm-frontend-plan.md F4.3
 */
export default function LeadStatusDropdown({
  status,
  onTransition,
  submitting = false,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);

  const hasTransitions = getValidTransitions(status).length > 0;
  const interactive = !disabled && hasTransitions;

  const handleSubmit = async (payload) => {
    await onTransition(payload);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => interactive && setOpen(true)}
        disabled={!interactive}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
          interactive
            ? 'border-(--border) bg-(--surface-2) hover:border-(--gold)/40 hover:shadow-sm active:scale-95 cursor-pointer'
            : 'border-(--border-subtle) bg-(--surface-1) cursor-not-allowed opacity-80'
        }`}
        title={!hasTransitions ? 'Sem transições disponíveis' : disabled ? 'Sem permissão para alterar' : 'Alterar status'}
      >
        <LeadStatusBadge status={status} showDot />
        {interactive && <ChevronDown size={12} className="text-(--text-muted)" aria-hidden />}
      </button>

      <StatusTransitionModal
        open={open}
        onClose={() => setOpen(false)}
        currentStatus={status}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </>
  );
}
