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
            className="flex-1 py-2.5 font-bold text-base text-(--text-muted) border border-(--border) rounded-2xl hover:bg-(--surface-1) hover:text-(--text-primary) transition-all active:scale-95 tracking-tight disabled:opacity-50"
          >
            Voltar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 bg-(--danger) text-white py-2.5 rounded-2xl  hover:shadow-2xl transition-all font-black text-base disabled:opacity-50 flex justify-center items-center gap-2 shadow-xl active:scale-95 tracking-tight"
          >
            {submitting ? <><Loader2 size={13} className="animate-spin" /> Cancelando...</> : <><XCircle size={13} /> Confirmar Cancelamento</>}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-base text-(--text-secondary) font-medium">
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
                className={`w-full p-3 rounded-2xl border text-left text-base font-bold transition-all active:scale-[0.99] disabled:opacity-50 ${
                  active
                    ? 'border-(--danger) bg-(--danger-soft) text-(--danger) shadow-sm'
                    : 'border-(--border) hover:border-(--border) hover:bg-(--surface-1) text-(--text-primary)'
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
