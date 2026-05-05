'use client';

import { useId, useState } from 'react';
import { Loader2, XCircle } from 'lucide-react';
import ModalBase from '@/components/ui/ModalBase';

/**
 * Dialog para cancelar um lead via PUT /leads/:id/cancel.
 * Motivo é obrigatório (min 1 char não-vazio, max 1000).
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - onSubmit: (motivo: string) => Promise<void>
 *  - submitting: boolean
 *
 * Spec: specs/crm.md §4.3 | Plan: specs/crm-frontend-plan.md F4.4
 */
export default function CancelLeadDialog({ open, onClose, onSubmit, submitting = false }) {
  const [motivo, setMotivo] = useState('');
  const motivoId = useId();

  const canSubmit = motivo.trim().length > 0 && !submitting;

  const handleClose = () => {
    setMotivo('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onSubmit(motivo.trim());
    setMotivo('');
  };

  return (
    <ModalBase
      open={open}
      onClose={submitting ? () => {} : handleClose}
      title="Cancelar Lead"
      subtitle="Motivo visível no histórico — obrigatório"
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
            {submitting ? <><Loader2 size={13} className="animate-spin" /> Cancelando...</> : <><XCircle size={13} /> Cancelar Lead</>}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-base text-(--text-secondary) font-medium">
          O lead ficará com status <strong>Cancelado</strong> e só poderá sair desse estado via
          reativação. Qualquer oportunidade de negócio em aberto será encerrada.
        </p>
        <div className="space-y-1.5">
          <label htmlFor={motivoId} className="text-sm font-black text-(--text-muted) px-1 tracking-tight">
            Motivo do cancelamento *
          </label>
          <textarea
            id={motivoId}
            rows={4}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={1000}
            disabled={submitting}
            required
            aria-required="true"
            className="premium-input px-4 py-2 text-base w-full resize-none disabled:opacity-50"
            placeholder="Ex: cliente desistiu da compra, endereço fora da área de atendimento, etc."
          />
          <p className="text-sm text-(--text-muted) px-1">
            {motivo.length}/1000 caracteres
          </p>
        </div>
      </div>
    </ModalBase>
  );
}
