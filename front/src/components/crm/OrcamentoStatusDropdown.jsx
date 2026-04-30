'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, Loader2, Send } from 'lucide-react';
import ModalBase from '@/components/ui/ModalBase';
import OrcamentoStatusBadge from './OrcamentoStatusBadge';
import { getValidTransitions } from '@/lib/orcamentoStatus';

/**
 * Dropdown + modal para alterar status do Orçamento entre os 3 não-terminais.
 * Cancelamento é outro modal (CancelOrcamentoDialog) e reativação é outro botão.
 *
 * Props:
 *  - status: string
 *  - onTransition: (newStatus) => Promise<void>
 *  - submitting: boolean
 *  - disabled: boolean
 */
export default function OrcamentoStatusDropdown({ status, onTransition, submitting = false, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const validTargets = useMemo(() => getValidTransitions(status), [status]);
  const hasTransitions = validTargets.length > 0;
  const interactive = !disabled && hasTransitions;

  const resetForm = () => setSelected(null);

  const handleClose = () => {
    resetForm();
    setOpen(false);
  };

  const handleSubmit = async () => {
    if (!selected || submitting) return;
    await onTransition(selected);
    resetForm();
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
            ? 'border-slate-200 bg-white hover:border-sky-300 hover:shadow-sm active:scale-95 cursor-pointer'
            : 'border-slate-100 bg-slate-50 cursor-not-allowed opacity-80'
        }`}
        title={!hasTransitions ? 'Sem transições disponíveis' : disabled ? 'Sem permissão' : 'Alterar status'}
      >
        <OrcamentoStatusBadge status={status} showDot />
        {interactive && <ChevronDown size={12} className="text-slate-400" aria-hidden />}
      </button>

      <ModalBase
        open={open}
        onClose={submitting ? () => {} : handleClose}
        title="Alterar Status do Orçamento"
        subtitle={`De "${status}" para...`}
        maxWidth="max-w-md"
        footer={
          <>
            <button
              onClick={handleClose}
              disabled={submitting}
              className="flex-1 py-2.5 font-bold text-base text-slate-400 border border-slate-200 rounded-2xl hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-95 tracking-tight disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selected || submitting}
              className="flex-1 bg-linear-to-r from-sky-500 to-sky-600 text-white py-2.5 rounded-2xl hover:shadow-sky-500/40 hover:shadow-2xl transition-all font-black text-base disabled:opacity-50 flex justify-center items-center gap-2 shadow-xl shadow-sky-900/10 active:scale-95 tracking-tight"
            >
              {submitting ? <><Loader2 size={13} className="animate-spin" /> Aplicando...</> : <><Send size={13} /> Aplicar</>}
            </button>
          </>
        }
      >
        <div className="space-y-2">
          {validTargets.map((target) => {
            const active = selected === target;
            return (
              <button
                type="button"
                key={target}
                onClick={() => setSelected(target)}
                className={`w-full p-3 rounded-2xl border text-left transition-all active:scale-[0.98] ${
                  active
                    ? 'border-sky-400 bg-sky-50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <OrcamentoStatusBadge status={target} />
              </button>
            );
          })}
        </div>
      </ModalBase>
    </>
  );
}
