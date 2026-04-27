'use client';

import { useState } from 'react';
import { Loader2, RefreshCw, GitBranch } from 'lucide-react';
import ModalBase from '@/components/ui/ModalBase';

const MODES = [
  {
    value: 'reativar',
    Icon: RefreshCw,
    title: 'Reativar este lead',
    description:
      'Restaura o lead para o status anterior ao cancelamento. Mantém todo o histórico e vínculos.',
  },
  {
    value: 'novo',
    Icon: GitBranch,
    title: 'Criar novo lead vinculado',
    description:
      'Preserva o lead cancelado como histórico e cria um novo lead vinculado à mesma conta, começando do zero.',
  },
];

/**
 * Dialog para reativar um lead cancelado via PUT /leads/:id/reactivate.
 * Dois modos:
 *   - 'reativar' (200): restaura o próprio lead para statusAntesCancelamento
 *   - 'novo'     (201): cria novo lead no mesmo Account
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - onSubmit: ({ modo, motivo }) => Promise<void>
 *  - submitting: boolean
 *
 * Spec: specs/crm.md §4.4 + §6.5 | Plan: specs/crm-frontend-plan.md F4.5
 */
export default function ReactivateLeadDialog({ open, onClose, onSubmit, submitting = false }) {
  const [modo, setModo] = useState('reativar');
  const [motivo, setMotivo] = useState('');

  const canSubmit = !!modo && !submitting;

  const resetForm = () => {
    setModo('reativar');
    setMotivo('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onSubmit({ modo, motivo: motivo.trim() || undefined });
    resetForm();
  };

  return (
    <ModalBase
      open={open}
      onClose={submitting ? () => {} : handleClose}
      title="Reativar Lead"
      subtitle="Escolha como retomar esse contato"
      maxWidth="max-w-lg"
      footer={
        <>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="flex-1 py-2.5 font-bold text-base text-slate-400 border border-slate-200 rounded-2xl hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-95 uppercase tracking-tight disabled:opacity-50"
          >
            Voltar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 bg-linear-to-r from-emerald-500 to-emerald-600 text-white py-2.5 rounded-2xl hover:shadow-emerald-500/40 hover:shadow-2xl transition-all font-black text-base disabled:opacity-50 flex justify-center items-center gap-2 shadow-xl shadow-emerald-900/10 active:scale-95 uppercase tracking-tight"
          >
            {submitting ? <><Loader2 size={13} className="animate-spin" /> Reativando...</> : <><RefreshCw size={13} /> Confirmar</>}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2" role="radiogroup" aria-label="Modo de reativação">
          {MODES.map(({ value, Icon, title, description }) => {
            const active = modo === value;
            return (
              <button
                type="button"
                key={value}
                role="radio"
                aria-checked={active}
                onClick={() => setModo(value)}
                className={`w-full p-4 rounded-2xl border text-left transition-all active:scale-[0.99] ${
                  active
                    ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-xl shrink-0 ${
                      active ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Icon size={14} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-black text-slate-900 uppercase tracking-tight mb-0.5">
                      {title}
                    </h4>
                    <p className="text-base text-slate-500 font-medium leading-relaxed">
                      {description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-black text-slate-400 px-1 uppercase tracking-tighter">
            Motivo (opcional)
          </label>
          <textarea
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={1000}
            disabled={submitting}
            className="premium-input px-4 py-2 text-base w-full resize-none disabled:opacity-50"
            placeholder="Contexto da reativação — visível no histórico..."
          />
        </div>
      </div>
    </ModalBase>
  );
}
