'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, Loader2, AlertTriangle, CheckCircle, XCircle, RefreshCw, Briefcase, ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { formatPhone } from '@/lib/utils';
import {
  getOrcamentoById,
  transitionOrcamentoStatus,
  cancelOrcamento,
  reactivateOrcamento,
} from '@/services/crmApi';
import { friendlyErrorMessage } from '@/lib/apiError';
import { OrcamentoStatus } from '@/lib/orcamentoStatus';
import OrcamentoStatusDropdown from '@/components/crm/OrcamentoStatusDropdown';
import CancelOrcamentoDialog from '@/components/crm/CancelOrcamentoDialog';

/**
 * Tela de detalhe/edição do Orçamento (N.O.N.).
 *
 * V1 tem campos mínimos — status, motivo cancelamento, timestamps, lead vinculado,
 * criador. Valor/validade/observações ficam pra iteração futura.
 *
 * Specs: specs/crm-non.md
 */
export default function OrcamentoDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orcamentoId = params.id;
  const { user, loading: authLoading } = useAuth();

  const [orcamento, setOrcamento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCancel, setShowCancel] = useState(false);

  const fetchOrcamento = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOrcamentoById(orcamentoId);
      setOrcamento(data);
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [orcamentoId]);

  useEffect(() => {
    if (!authLoading && user) fetchOrcamento();
  }, [user, authLoading, fetchOrcamento]);

  const clearFeedback = () => {
    setError('');
    setSuccess('');
  };

  const runAction = async (fn, successMsg) => {
    setBusy(true);
    clearFeedback();
    try {
      await fn();
      setSuccess(successMsg);
      await fetchOrcamento();
      return true;
    } catch (err) {
      setError(friendlyErrorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleTransition = async (newStatus) => {
    await runAction(
      () => transitionOrcamentoStatus(orcamentoId, newStatus),
      `Status alterado para "${newStatus}".`,
    );
  };

  const handleCancel = async (motivo) => {
    const ok = await runAction(
      () => cancelOrcamento(orcamentoId, motivo),
      'Orçamento cancelado.',
    );
    if (ok) setShowCancel(false);
  };

  const handleReactivate = async () => {
    await runAction(
      () => reactivateOrcamento(orcamentoId),
      'Orçamento reativado.',
    );
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={24} className="animate-spin text-(--gold)" />
      </div>
    );
  }

  if (!orcamento) {
    return (
      <div className="max-w-[900px] mx-auto">
        <div className="bg-(--danger-soft) border border-(--danger)/30 text-(--danger) p-3 rounded-2xl text-base flex items-start gap-2 shadow-sm mt-6">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <p className="font-bold">{error || 'Orçamento não encontrado.'}</p>
        </div>
      </div>
    );
  }

  const lead = orcamento.lead || {};
  const criadoPor = orcamento.criadoPor;
  const isCancelado = orcamento.status === OrcamentoStatus.CANCELADO;
  const leadCancelado = lead.status === 'Cancelado';

  return (
    <div className="mb-4 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 border-b border-(--border) pb-3">
        <button
          onClick={() => router.push('/crm/oportunidade-de-negocio')}
          className="p-2 text-(--text-muted) hover:text-(--text-primary) hover:bg-(--surface-1) rounded-xl transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-(--text-primary) tracking-tight">
            Orçamento <span className="text-(--gold)">{orcamento.numero}</span>
          </h1>
          <p className="text-sm text-(--text-muted) font-bold mt-0.5">
            Criado em {new Date(orcamento.createdAt).toLocaleString('pt-BR')}
            {criadoPor?.nome && ` por ${criadoPor.nome}`}
          </p>
        </div>
      </div>

      {/* Feedback */}
      {error && (
        <div className="bg-(--danger-soft) border border-(--danger)/30 text-(--danger) p-3 rounded-2xl text-base flex items-start gap-2 shadow-sm mb-4 animate-in slide-in-from-top-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <p className="font-bold">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-(--success-soft) border border-(--success)/30 text-(--success) p-3 rounded-2xl text-base flex items-start gap-2 shadow-sm mb-4 animate-in slide-in-from-top-2">
          <CheckCircle size={14} className="shrink-0 mt-0.5" />
          <p className="font-bold">{success}</p>
        </div>
      )}

      {/* Warning se Lead está Cancelado */}
      {leadCancelado && (
        <div
          role="status"
          className="flex items-start gap-3 p-4 mb-4 rounded-2xl border border-(--gold)/40 bg-(--gold-soft) shadow-sm"
        >
          <AlertTriangle size={14} className="text-(--gold) shrink-0 mt-0.5" />
          <p className="text-base text-(--gold) font-medium leading-relaxed">
            <strong>Atenção:</strong> o Lead vinculado a este Orçamento está Cancelado.
            Considere reativar o Lead antes de avançar com esta oportunidade.
          </p>
        </div>
      )}

      {/* Painel Status + Ações */}
      <div className="glass-card border border-white/60 rounded-3xl p-6 shadow-floating bg-(--surface-2)/40 backdrop-blur-xl mb-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-black text-(--text-muted) px-1 tracking-tight">
              Status
            </label>
            <OrcamentoStatusDropdown
              status={orcamento.status}
              onTransition={handleTransition}
              submitting={busy}
            />
            {isCancelado && orcamento.motivoCancelamento && (
              <p className="text-sm text-(--danger) font-bold px-1 mt-1">
                Motivo: {orcamento.motivoCancelamento}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {!isCancelado && (
              <button
                type="button"
                onClick={() => setShowCancel(true)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-black text-(--danger) bg-(--danger-soft) border border-(--danger)/30 hover:bg-(--danger-soft) transition-all tracking-tight shadow-xs active:scale-95 disabled:opacity-50"
              >
                <XCircle size={13} /> Cancelar Orçamento
              </button>
            )}
            {isCancelado && (
              <button
                type="button"
                onClick={handleReactivate}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-black text-(--success) bg-(--success-soft) border border-(--success)/30 hover:bg-(--success-soft) transition-all tracking-tight shadow-xs active:scale-95 disabled:opacity-50"
              >
                <RefreshCw size={13} /> Reativar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lead vinculado */}
      <div className="glass-card border border-white/60 rounded-3xl p-6 shadow-floating bg-(--surface-2)/40 backdrop-blur-xl mb-6">
        <h3 className="text-(--gold) font-black text-sm tracking-tight flex items-center gap-2 px-1 mb-4">
          <Briefcase size={12} className="text-(--gold)" /> Lead Vinculado
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-base">
          <div>
            <p className="text-sm font-black text-(--text-muted) tracking-tight mb-1">Nome</p>
            <p className="font-bold text-(--text-primary)">
              {lead.nome} {lead.sobrenome || ''}
            </p>
          </div>
          <div>
            <p className="text-sm font-black text-(--text-muted) tracking-tight mb-1">Celular</p>
            <p className="font-bold text-(--text-primary)">{formatPhone(lead.celular || '')}</p>
          </div>
          <div>
            <p className="text-sm font-black text-(--text-muted) tracking-tight mb-1">Status do Lead</p>
            <p className="font-bold text-(--text-primary)">{lead.status || '—'}</p>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={() => router.push(`/crm/leads/${lead.id}`)}
            className="inline-flex items-center gap-1.5 text-base font-bold text-(--gold) hover:text-(--gold-hover) transition-all"
          >
            <ExternalLink size={12} /> Abrir Lead #{String(lead.id).padStart(4, '0')}
          </button>
        </div>
      </div>

      <CancelOrcamentoDialog
        open={showCancel}
        onClose={() => setShowCancel(false)}
        onSubmit={handleCancel}
        submitting={busy}
      />
    </div>
  );
}
