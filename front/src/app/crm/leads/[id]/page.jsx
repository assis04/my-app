'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft, Save, Briefcase, Loader2,
  AlertTriangle, Trash2, CheckCircle, XCircle, RefreshCw, History,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { formatPhone } from '@/lib/utils';
import { useRouter, useParams } from 'next/navigation';
import { isAdmin, isSeller } from '@/lib/roles';
import { INITIAL_LEAD_FORM, validateLeadForm } from '@/lib/leadConstants';
import { friendlyErrorMessage } from '@/lib/apiError';
import { LeadStatus, requiresAdminToEdit } from '@/lib/leadStatus';
import { hasPermission, CRM_PERMISSIONS } from '@/lib/permissions';
import { getOrcamentoByLeadId, createOrcamento } from '@/services/crmApi';
import OrcamentoStatusBadge from '@/components/crm/OrcamentoStatusBadge';

import LeadFormFields from '@/components/crm/LeadFormFields';
import LeadStatusDropdown from '@/components/crm/LeadStatusDropdown';
import CancelLeadDialog from '@/components/crm/CancelLeadDialog';
import ReactivateLeadDialog from '@/components/crm/ReactivateLeadDialog';
import PostSaleReadOnlyBanner from '@/components/crm/PostSaleReadOnlyBanner';
import LeadHistoryTimeline from '@/components/crm/LeadHistoryTimeline';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';
import { useLeadActions } from '@/hooks/useLeadActions';

export default function EditLeadPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const leadId = params.id;

  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [form, setForm] = useState(INITIAL_LEAD_FORM);
  const [leadStatus, setLeadStatus] = useState(LeadStatus.EM_PROSPECCAO);
  const [conta, setConta] = useState(null);
  const [history, setHistory] = useState([]);
  const [showCancel, setShowCancel] = useState(false);
  const [showReactivate, setShowReactivate] = useState(false);
  const [orcamento, setOrcamento] = useState(null);
  const [creatingOrcamento, setCreatingOrcamento] = useState(false);
  const { confirm, confirmProps } = useConfirm();

  const fetchLead = useCallback(async () => {
    setLoading(true);
    try {
      const lead = await api(`/api/crm/leads/${leadId}`);
      setForm({
        nome: lead.nome || '',
        sobrenome: lead.sobrenome || '',
        celular: lead.celular ? formatPhone(lead.celular) : '',
        email: lead.email || '',
        cep: lead.cep || '',
        conjugeNome: lead.conjugeNome || '',
        conjugeSobrenome: lead.conjugeSobrenome || '',
        conjugeCelular: lead.conjugeCelular ? formatPhone(lead.conjugeCelular) : '',
        conjugeEmail: lead.conjugeEmail || '',
        origemCanal: lead.origemCanal || '',
        preVendedorId: lead.preVendedorId ? String(lead.preVendedorId) : '',
      });
      setLeadStatus(lead.status || LeadStatus.EM_PROSPECCAO);
      setConta(lead.conta || null);
      setHistory(Array.isArray(lead.history) ? lead.history : []);
    } catch (err) {
      setSaveError(friendlyErrorMessage(err) || 'Erro ao carregar lead.');
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  const actions = useLeadActions(leadId, fetchLead);

  const fetchOrcamento = useCallback(async () => {
    try {
      const orc = await getOrcamentoByLeadId(leadId);
      setOrcamento(orc);
    } catch (err) {
      // 404 significa "sem orçamento vinculado" — estado válido, não é erro
      if (err?.status !== 404) {
        console.warn('Falha ao buscar Orçamento vinculado:', err);
      }
      setOrcamento(null);
    }
  }, [leadId]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchLead();
      fetchOrcamento();
      api('/users/lookup').then(raw => {
        const res = Array.isArray(raw) ? raw : (raw?.data ?? []);
        setSellers(res.filter(u => u.ativo !== false).map(u => ({ id: u.id, nome: u.nome })));
      }).catch(() => {});
    }
  }, [user, authLoading, fetchLead, fetchOrcamento]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setSaveSuccess('');
    actions.clearFeedback();
  };

  const handleSave = async () => {
    const validationError = validateLeadForm(form);
    if (validationError) { setSaveError(validationError); return; }

    setSaveError('');
    setSaveSuccess('');
    setSaving(true);
    try {
      // Só envia campos editáveis — status/etapa ficam em endpoints dedicados.
      // Spec: specs/crm.md §9.3.
      const payload = {
        nome: form.nome,
        sobrenome: form.sobrenome,
        celular: form.celular,
        email: form.email,
        cep: form.cep,
        conjugeNome: form.conjugeNome,
        conjugeSobrenome: form.conjugeSobrenome,
        conjugeCelular: form.conjugeCelular,
        conjugeEmail: form.conjugeEmail,
        origemCanal: form.origemCanal,
        preVendedorId: form.preVendedorId || null,
      };
      await api(`/api/crm/leads/${leadId}`, { method: 'PUT', body: payload });
      setSaveSuccess('Lead atualizado com sucesso.');
    } catch (err) {
      setSaveError(friendlyErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    confirm({
      title: 'Remover Lead',
      message: `Tem certeza que deseja remover o lead "${form.nome}"? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Remover',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api(`/api/crm/leads/${leadId}`, { method: 'DELETE' });
          router.push('/crm/leads');
        } catch (err) {
          setSaveError(friendlyErrorMessage(err));
        }
      },
    });
  };

  const handleCancelConfirm = async (motivo) => {
    const ok = await actions.cancelLead(motivo);
    if (ok) setShowCancel(false);
  };

  const handleOrcamentoAction = async () => {
    setSaveError('');
    setSaveSuccess('');
    // Já existe → navega direto
    if (orcamento?.id) {
      router.push(`/crm/oportunidade-de-negocio/${orcamento.id}`);
      return;
    }
    // Senão → cria + navega
    setCreatingOrcamento(true);
    try {
      const novo = await createOrcamento(leadId);
      router.push(`/crm/oportunidade-de-negocio/${novo.id}`);
    } catch (err) {
      setSaveError(friendlyErrorMessage(err));
      setCreatingOrcamento(false);
    }
  };

  const handleReactivateConfirm = async ({ modo, motivo }) => {
    const res = await actions.reactivateLead({ modo, motivo });
    if (res) {
      setShowReactivate(false);
      // Modo 'novo' retorna { leadAntigo, leadNovo } — redirecionar pro novo lead.
      if (modo === 'novo' && res.leadNovo?.id) {
        router.push(`/crm/leads/${res.leadNovo.id}`);
      }
    }
  };

  const isVendedor = isSeller(user);
  const isAdm = isAdmin(user);

  // Bloqueio pós-venda: Venda/Pós-venda exigem permissão edit-after-sale
  const isPostSale = useMemo(() => requiresAdminToEdit(leadStatus), [leadStatus]);
  const canEditAfterSale = useMemo(
    () => hasPermission(user, CRM_PERMISSIONS.EDIT_AFTER_SALE),
    [user],
  );
  const formDisabled = isPostSale && !canEditAfterSale;

  const isCancelado = leadStatus === LeadStatus.CANCELADO;
  const isTerminalSale = leadStatus === LeadStatus.VENDA || leadStatus === LeadStatus.POS_VENDA;

  if (authLoading) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={24} className="animate-spin text-(--gold)" />
      </div>
    );
  }

  const displayError = saveError || actions.error;
  const displaySuccess = saveSuccess || actions.success;

  return (
    <div className="mb-4 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-6 border-b border-(--border) pb-3">
        <button onClick={() => router.push('/crm/leads')} className="p-2 text-(--text-muted) hover:text-(--text-primary) hover:bg-(--surface-1) rounded-xl transition-all shrink-0">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-(--text-primary) tracking-tight truncate">
            Editar Lead <span className="text-(--gold)">#{String(leadId).padStart(4, '0')}</span>
          </h1>
          {conta && (
            <p className="text-sm text-(--text-muted) font-bold mt-0.5 truncate">
              Conta vinculada: {conta.nome} {conta.sobrenome || ''} &middot; {formatPhone(conta.celular)}
            </p>
          )}
        </div>
        <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-black text-(--danger) bg-(--danger-soft) border border-(--danger)/30 hover:bg-(--danger-soft) transition-all tracking-tight shadow-xs active:scale-95 shrink-0">
          <Trash2 size={13} /> Excluir
        </button>
      </div>

      {/* Alertas: banner pós-venda + feedback de erro/sucesso (sempre topo) */}
      {formDisabled && <PostSaleReadOnlyBanner status={leadStatus} />}

      {displayError && (
        <div className="bg-(--danger-soft) border border-(--danger)/30 text-(--danger) p-3 rounded-2xl text-base flex items-start gap-2 shadow-sm mb-4 animate-in slide-in-from-top-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <p className="font-bold">{displayError}</p>
        </div>
      )}

      {displaySuccess && (
        <div className="bg-(--success-soft) border border-(--success)/30 text-(--success) p-3 rounded-2xl text-base flex items-start gap-2 shadow-sm mb-4 animate-in slide-in-from-top-2">
          <CheckCircle size={14} className="shrink-0 mt-0.5" />
          <p className="font-bold">{displaySuccess}</p>
        </div>
      )}

      {/* 1. Informações do Lead (identificação + cônjuge + atribuição) */}
      <div className="glass-card border border-(--border-subtle) rounded-3xl p-6 shadow-floating bg-(--surface-2)/40 backdrop-blur-xl space-y-6 mb-6">
        <LeadFormFields
          form={form}
          onChange={handleChange}
          sellers={sellers}
          isVendedor={isVendedor}
          isAdm={isAdm}
          userName={user?.nome}
          disabled={formDisabled}
        />
      </div>

      {/* 2. Status + Ações rápidas (temperatura agora é editada na listagem) */}
      <div className="glass-card border border-(--border-subtle) rounded-3xl p-6 shadow-floating bg-(--surface-2)/40 backdrop-blur-xl mb-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-black text-(--text-muted) px-1 tracking-tight">Status</label>
            <LeadStatusDropdown
              status={leadStatus}
              onTransition={actions.transitionStatus}
              submitting={actions.busy}
              disabled={formDisabled}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {!isCancelado && (
              <button
                type="button"
                onClick={() => setShowCancel(true)}
                disabled={actions.busy || formDisabled}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-black text-(--danger) bg-(--danger-soft) border border-(--danger)/30 hover:bg-(--danger-soft) transition-all tracking-tight shadow-xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircle size={13} /> Cancelar Lead
              </button>
            )}
            {isCancelado && (
              <button
                type="button"
                onClick={() => setShowReactivate(true)}
                disabled={actions.busy}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-black text-(--success) bg-(--success-soft) border border-(--success)/30 hover:bg-(--success-soft) transition-all tracking-tight shadow-xs active:scale-95 disabled:opacity-50"
              >
                <RefreshCw size={13} /> Reativar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Orçamento vinculado (só aparece se já existir um) */}
      {orcamento && (
        <button
          type="button"
          onClick={() => router.push(`/crm/oportunidade-de-negocio/${orcamento.id}`)}
          className="w-full flex items-center gap-3 p-3 mb-6 rounded-2xl border border-(--gold) bg-(--gold-soft) hover:bg-(--gold-soft) transition-all shadow-sm active:scale-[0.99]"
        >
          <div className="p-2 bg-(--gold) text-(--on-gold) rounded-xl shrink-0">
            <Briefcase size={14} />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-black text-(--gold) tracking-tight">
              Orçamento vinculado
            </p>
            <p className="text-base font-bold text-(--gold) truncate">
              {orcamento.numero}
            </p>
          </div>
          <OrcamentoStatusBadge status={orcamento.status} size="xs" />
        </button>
      )}

      {/* Footer — Botões */}
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <button onClick={() => router.push('/crm/leads')} className="flex-1 py-3 font-bold text-base text-(--text-muted) border border-(--border) rounded-2xl hover:bg-(--surface-1) hover:text-(--text-primary) transition-all active:scale-95 shadow-sm tracking-tight">
          Voltar
        </button>
        <button
          onClick={handleSave}
          disabled={saving || formDisabled}
          className="flex-1 bg-(--gold) text-(--on-gold) py-3 rounded-2xl  hover:shadow-2xl transition-all font-black text-base disabled:opacity-50 flex justify-center items-center gap-2 shadow-xl active:scale-95 tracking-tight"
        >
          {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : <><Save size={14} /> Salvar Alterações</>}
        </button>
        {!isTerminalSale && !isCancelado && (
          <button
            onClick={handleOrcamentoAction}
            disabled={creatingOrcamento}
            className="flex-1 bg-(--gold) text-(--on-gold) py-3 rounded-2xl  hover:shadow-2xl transition-all font-black text-base flex justify-center items-center gap-2 shadow-xl  active:scale-95 tracking-tight disabled:opacity-50"
          >
            {creatingOrcamento
              ? <><Loader2 size={14} className="animate-spin" /> Criando...</>
              : orcamento
                ? <><Briefcase size={14} /> Abrir Orçamento {orcamento.numero}</>
                : <><Briefcase size={14} /> Nova Oportunidade</>}
          </button>
        )}
      </div>

      {/* Timeline de histórico */}
      <div className="mt-8 glass-card border border-(--border-subtle) rounded-3xl p-6 shadow-floating bg-(--surface-2)/40 backdrop-blur-xl">
        <h3 className="text-(--gold) font-black text-sm tracking-tight flex items-center gap-2 px-1 mb-4">
          <History size={12} className="text-(--gold)" /> Histórico do Lead
        </h3>
        <LeadHistoryTimeline
          leadId={leadId}
          initialEvents={history}
        />
      </div>

      <CancelLeadDialog
        open={showCancel}
        onClose={() => setShowCancel(false)}
        onSubmit={handleCancelConfirm}
        submitting={actions.busy}
      />

      <ReactivateLeadDialog
        open={showReactivate}
        onClose={() => setShowReactivate(false)}
        onSubmit={handleReactivateConfirm}
        submitting={actions.busy}
      />

      <ConfirmDialog {...confirmProps} />
    </div>
  );
}
