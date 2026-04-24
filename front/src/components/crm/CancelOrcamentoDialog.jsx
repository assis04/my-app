'use client';

import { useState } from 'react';
import { Loader2, XCircle } from 'lucide-react';
import ModalBase from '@/components/ui/ModalBase';
import { MOTIVOS_CANCELAMENTO } from '@/lib/orcamentoStatus';

/**
 * Dialog para cancelar um Orçamento.
 * Motivo obrigatório entre os 5 valores canônicos (select).
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - onSubmit: (motivo: string) => Promise<void>
 *  - submitting: boolean
 *
 * Specs: specs/crm-non.md (decisão 1 — 5 motivos enumerados)
 */
export default function CancelOrcamentoDialog({ open, onClose, onSubmit, submitting = false }) {
  const [motivo, setMotivo] = useState('');

  const canSubmit = !!motivo && !submitting;

  const handleClose = () => {
    setMotivo('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onSubmit(motivo);
    setMotivo('');
  };

  return (
    <ModalBase
      open={open}
      onClose={submitting ? () => {} : handleClose}
      title="Cancelar Orçamento"
      subtitle="Escolha o motivo (obrigatório — visível no histórico)"
      maxWidth="max-w-md"
      footer={
        <>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="flex-1 py-2.5 font-bold text-xs text-slate-400 border border-slate-200 rounded-2xl hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-95 uppercase tracking-tight disabled:opacity-50"
          >
            Voltar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 bg-linear-to-r from-rose-500 to-rose-600 text-white py-2.5 rounded-2xl hover:shadow-rose-500/40 hover:shadow-2xl transition-all font-black text-xs disabled:opacity-50 flex justify-center items-center gap-2 shadow-xl shadow-rose-900/10 active:scale-95 uppercase tracking-tight"
          >
            {submitting ? <><Loader2 size={13} className="animate-spin" /> Cancelando...</> : <><XCircle size={13} /> Confirmar Cancelamento</>}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-slate-500 font-medium">
          O Orçamento ficará com status <strong>Cancelado</strong> e só sairá desse estado via reativação.
        </p>
        <div className="space-y-2" role="radiogroup" aria-label="Motivo do cancelamento">
          {MOTIVOS_CANCELAMENTO.map((opt) => {
            const active = motivo === opt;
            return (
              <button
                type="button"
                key={opt}
                role="radio"
                aria-checked={active}
                onClick={() => setMotivo(opt)}
                disabled={submitting}
                className={`w-full p-3 rounded-2xl border text-left text-xs font-bold transition-all active:scale-[0.99] disabled:opacity-50 ${
                  active
                    ? 'border-rose-400 bg-rose-50 text-rose-900 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    </ModalBase>
  );
}
