'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
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

import LeadFormFields from '@/components/crm/LeadFormFields';
import CancelLeadDialog from '@/components/crm/CancelLeadDialog';
import ReactivateLeadDialog from '@/components/crm/ReactivateLeadDialog';
import PostSaleReadOnlyBanner from '@/components/crm/PostSaleReadOnlyBanner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';
import { useLeadActions } from '@/hooks/useLeadActions';

import LeadHeader from './components/LeadHeader';
import LeadAside from './components/LeadAside';
import DirtyBar from './components/DirtyBar';

/**
 * Constrói o objeto de form a partir do payload do GET /leads/:id.
 * Centralizado pra que o snapshot inicial e o re-fetch sigam a mesma forma.
 */
function buildFormFromLead(lead) {
  return {
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
  };
}

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

  // Snapshot do form imediatamente após fetch — fonte da verdade pra dirty tracking.
  const initialFormRef = useRef(null);

  const fetchLead = useCallback(async () => {
    setLoading(true);
    try {
      // Promise.all corta latência cumulativa (~300-600ms → ~150-200ms)
      const [lead, orc, sellersRaw] = await Promise.all([
        api(`/api/crm/leads/${leadId}`),
        getOrcamentoByLeadId(leadId).catch((err) => {
          // 404 é estado válido (sem orçamento vinculado)
          if (err?.status === 404) return null;
          console.warn('Falha ao buscar Orçamento vinculado:', err);
          return null;
        }),
        api('/users/lookup').catch(() => []),
      ]);

      const newForm = buildFormFromLead(lead);
      setForm(newForm);
      initialFormRef.current = newForm; // captura snapshot — base do dirty
      setLeadStatus(lead.status || LeadStatus.EM_PROSPECCAO);
      setConta(lead.conta || null);
      setHistory(Array.isArray(lead.history) ? lead.history : []);
      setOrcamento(orc);

      const sellersList = Array.isArray(sellersRaw) ? sellersRaw : (sellersRaw?.data ?? []);
      setSellers(sellersList.filter((u) => u.ativo !== false).map((u) => ({ id: u.id, nome: u.nome })));
    } catch (err) {
      setSaveError(friendlyErrorMessage(err) || 'Erro ao carregar lead.');
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  const actions = useLeadActions(leadId, fetchLead);

  useEffect(() => {
    if (!authLoading && user) fetchLead();
  }, [user, authLoading, fetchLead]);

  // Dirty tracking — compara JSON do form atual com snapshot inicial
  const { isDirty, dirtyCount } = useMemo(() => {
    if (!initialFormRef.current) return { isDirty: false, dirtyCount: 0 };
    let count = 0;
    for (const key of Object.keys(form)) {
      if ((form[key] ?? '') !== (initialFormRef.current[key] ?? '')) count++;
    }
    return { isDirty: count > 0, dirtyCount: count };
  }, [form]);

  // beforeunload: avisa se user tenta fechar/recarregar com mudanças pendentes
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaveSuccess('');
    actions.clearFeedback();
  };

  const handleDiscard = () => {
    if (!initialFormRef.current) return;
    setForm(initialFormRef.current);
    setSaveError('');
    setSaveSuccess('');
  };

  const handleSave = async () => {
    const validationError = validateLeadForm(form);
    if (validationError) {
      setSaveError(validationError);
      return;
    }

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
      setSaveSuccess('Alterações salvas.');
      // Atualiza snapshot pra zerar dirty state
      initialFormRef.current = form;
      // Toast efêmero — some sozinho após 3s
      setTimeout(() => setSaveSuccess(''), 3000);
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

  const handleCreateOrcamento = async () => {
    setSaveError('');
    setSaveSuccess('');
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
      if (modo === 'novo' && res.leadNovo?.id) {
        router.push(`/crm/leads/${res.leadNovo.id}`);
      }
    }
  };

  const isVendedor = isSeller(user);
  const isAdm = isAdmin(user);
  const isPostSale = useMemo(() => requiresAdminToEdit(leadStatus), [leadStatus]);
  const canEditAfterSale = useMemo(() => hasPermission(user, CRM_PERMISSIONS.EDIT_AFTER_SALE), [user]);
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
    <div className="max-w-[1400px] mx-auto pb-24">
      <LeadHeader
        leadId={leadId}
        form={form}
        leadStatus={leadStatus}
        onStatusTransition={actions.transitionStatus}
        busy={actions.busy}
        formDisabled={formDisabled}
        isCancelado={isCancelado}
        onCancelLead={() => setShowCancel(true)}
        onReactivate={() => setShowReactivate(true)}
        onDelete={handleDelete}
      />

      {/* Banner pós-venda + feedback (no fluxo do conteúdo, não no header) */}
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

      {/* Layout principal: 8/4 em xl, stacked abaixo */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <main className="xl:col-span-8">
          <div className="bg-(--surface-2) border border-(--border-subtle) rounded-3xl p-6 shadow-floating space-y-6">
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
        </main>

        <div className="xl:col-span-4">
          <LeadAside
            conta={conta}
            orcamento={orcamento}
            history={history}
            leadId={leadId}
            isTerminalSale={isTerminalSale}
            isCancelado={isCancelado}
            creatingOrcamento={creatingOrcamento}
            onCreateOrcamento={handleCreateOrcamento}
          />
        </div>
      </div>

      <DirtyBar
        isDirty={isDirty && !formDisabled}
        isSaving={saving}
        dirtyCount={dirtyCount}
        onSave={handleSave}
        onDiscard={handleDiscard}
        disabled={formDisabled}
      />

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
