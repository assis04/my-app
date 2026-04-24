'use client';

import { useState } from 'react';
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
            className="flex-1 py-2.5 font-bold text-xs text-slate-400 border border-slate-200 rounded-2xl hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-95 uppercase tracking-tight disabled:opacity-50"
          >
            Voltar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 bg-linear-to-r from-rose-500 to-rose-600 text-white py-2.5 rounded-2xl hover:shadow-rose-500/40 hover:shadow-2xl transition-all font-black text-xs disabled:opacity-50 flex justify-center items-center gap-2 shadow-xl shadow-rose-900/10 active:scale-95 uppercase tracking-tight"
          >
            {submitting ? <><Loader2 size={13} className="animate-spin" /> Cancelando...</> : <><XCircle size={13} /> Cancelar Lead</>}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-slate-500 font-medium">
          O lead ficará com status <strong>Cancelado</strong> e só poderá sair desse estado via
          reativação. Qualquer oportunidade de negócio em aberto será encerrada.
        </p>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 px-1 uppercase tracking-tighter">
            Motivo do cancelamento *
          </label>
          <textarea
            rows={4}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={1000}
            disabled={submitting}
            className="premium-input px-4 py-2 text-sm w-full resize-none disabled:opacity-50"
            placeholder="Ex: cliente desistiu da compra, endereço fora da área de atendimento, etc."
          />
          <p className="text-[10px] text-slate-400 px-1">
            {motivo.length}/1000 caracteres
          </p>
        </div>
      </div>
    </ModalBase>
  );
}
