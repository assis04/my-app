'use client';

import { useState, useMemo } from 'react';
import { Loader2, Send } from 'lucide-react';
import ModalBase from '@/components/ui/ModalBase';
import LeadStatusBadge from './LeadStatusBadge';
import { getValidTransitions, STATUSES_REQUIRING_DATETIME } from '@/lib/leadStatus';

/**
 * Modal para alterar status do lead via PUT /leads/:id/status.
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - currentStatus: string
 *  - onSubmit: ({ status, motivo, contexto }) => Promise<void>
 *  - submitting: boolean
 *
 * Regras:
 *  - Só lista transições válidas (getValidTransitions do lib/leadStatus)
 *  - Status em STATUSES_REQUIRING_DATETIME exibe input datetime-local obrigatório
 *  - Motivo é sempre opcional nessa modal (cancelamento usa modal dedicado)
 *
 * Spec: specs/crm.md §4.2 | Plan: specs/crm-frontend-plan.md F4.2
 */
export default function StatusTransitionModal({
  open,
  onClose,
  currentStatus,
  onSubmit,
  submitting = false,
}) {
  const validTargets = useMemo(() => getValidTransitions(currentStatus), [currentStatus]);

  const [selected, setSelected] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [datetimeLocal, setDatetimeLocal] = useState('');

  const needsDatetime = selected && STATUSES_REQUIRING_DATETIME.includes(selected);
  const datetimeMissing = needsDatetime && !datetimeLocal;
  const canSubmit = selected && !datetimeMissing && !submitting;

  const resetForm = () => {
    setSelected(null);
    setMotivo('');
    setDatetimeLocal('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const payload = {
      status: selected,
      motivo: motivo.trim() || undefined,
      contexto: {},
    };
    if (datetimeLocal) {
      // datetime-local é "YYYY-MM-DDTHH:mm" (sem timezone) — convertemos para ISO com offset local
      payload.contexto.agendadoPara = new Date(datetimeLocal).toISOString();
    }
    await onSubmit(payload);
    resetForm();
  };

  return (
    <ModalBase
      open={open}
      onClose={submitting ? () => {} : handleClose}
      title="Alterar Status"
      subtitle={`De "${currentStatus}" para...`}
      maxWidth="max-w-md"
      footer={
        <>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="flex-1 py-2.5 font-bold text-base text-slate-400 border border-slate-200 rounded-2xl hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-95 uppercase tracking-tight disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 bg-linear-to-r from-sky-500 to-sky-600 text-white py-2.5 rounded-2xl hover:shadow-sky-500/40 hover:shadow-2xl transition-all font-black text-base disabled:opacity-50 flex justify-center items-center gap-2 shadow-xl shadow-sky-900/10 active:scale-95 uppercase tracking-tight"
          >
            {submitting ? <><Loader2 size={13} className="animate-spin" /> Aplicando...</> : <><Send size={13} /> Aplicar</>}
          </button>
        </>
      }
    >
      {validTargets.length === 0 ? (
        <p className="text-base text-slate-500 font-medium text-center py-4">
          Nenhuma transição disponível a partir de <strong>{currentStatus}</strong>.
          {currentStatus === 'Cancelado' && ' Use "Reativar" para restaurar.'}
        </p>
      ) : (
        <div className="space-y-4">
          {/* Lista de destinos */}
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
                  <LeadStatusBadge status={target} />
                </button>
              );
            })}
          </div>

          {/* Datetime condicional */}
          {needsDatetime && (
            <div className="space-y-1.5">
              <label className="text-sm font-black text-slate-400 px-1 uppercase tracking-tighter">
                Agendar para *
              </label>
              <input
                type="datetime-local"
                value={datetimeLocal}
                onChange={(e) => setDatetimeLocal(e.target.value)}
                className="premium-input h-9 px-4 text-base w-full"
              />
            </div>
          )}

          {/* Motivo opcional */}
          <div className="space-y-1.5">
            <label className="text-sm font-black text-slate-400 px-1 uppercase tracking-tighter">
              Motivo (opcional)
            </label>
            <textarea
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={1000}
              className="premium-input px-4 py-2 text-base w-full resize-none"
              placeholder="Contexto da mudança — visível no histórico do lead..."
            />
          </div>
        </div>
      )}
    </ModalBase>
  );
}
