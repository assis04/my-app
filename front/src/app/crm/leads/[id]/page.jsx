'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Save, Briefcase, Loader2,
  AlertTriangle, Trash2, CheckCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { formatPhone } from '@/lib/utils';
import { useRouter, useParams } from 'next/navigation';
import { isAdmin, isSeller } from '@/lib/roles';
import { INITIAL_LEAD_FORM, validateLeadForm } from '@/lib/leadConstants';
import LeadFormFields from '@/components/crm/LeadFormFields';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';

export default function EditLeadPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const leadId = params.id;

  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(INITIAL_LEAD_FORM);
  const [conta, setConta] = useState(null);
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
        status: lead.status || 'Prospecção',
        etapa: lead.etapa || lead.etapaJornada || '',
        origemCanal: lead.origemCanal || '',
        preVendedorId: lead.preVendedorId ? String(lead.preVendedorId) : '',
        idKanban: lead.idKanban || '',
      });
      setConta(lead.conta || null);
    } catch (err) {
      setError('Erro ao carregar lead.');
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchLead();
      api('/users').then(raw => {
        const res = raw?.data ?? (Array.isArray(raw) ? raw : []);
        setSellers(res.filter(u => u.ativo !== false).map(u => ({ id: u.id, nome: u.nome })));
      }).catch(() => {});
    }
  }, [user, authLoading, fetchLead]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setSuccess('');
  };

  const handleSave = async () => {
    const validationError = validateLeadForm(form);
    if (validationError) { setError(validationError); return; }

    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await api(`/api/crm/leads/${leadId}`, {
        method: 'PUT',
        body: { ...form, preVendedorId: form.preVendedorId || null },
      });
      setSuccess('Lead atualizado com sucesso.');
    } catch (err) {
      setError(err?.message || err || 'Erro ao atualizar lead.');
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
          setError(err?.message || err || 'Erro ao remover lead.');
        }
      },
    });
  };

  const isVendedor = isSeller(user);
  const isAdm = isAdmin(user);

  if (authLoading) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={24} className="animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <div className="mb-4 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 border-b border-slate-200 pb-3">
        <button onClick={() => router.push('/crm/leads')} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase tracking-tighter italic">
            Editar Lead <span className="text-sky-500">#{String(leadId).padStart(4, '0')}</span>
          </h1>
          {conta && (
            <p className="text-[10px] text-slate-400 font-bold mt-0.5 italic">
              Conta vinculada: {conta.nome} {conta.sobrenome || ''} &middot; {formatPhone(conta.celular)}
            </p>
          )}
        </div>
        <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-[10px] font-black text-rose-500 bg-rose-50 border border-rose-100 hover:bg-rose-100 transition-all uppercase tracking-tighter shadow-xs active:scale-95">
          <Trash2 size={13} /> Excluir
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-600 p-3 rounded-2xl text-xs flex items-start gap-2 shadow-sm mb-4 animate-in slide-in-from-top-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <p className="font-bold">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-3 rounded-2xl text-xs flex items-start gap-2 shadow-sm mb-4 animate-in slide-in-from-top-2">
          <CheckCircle size={14} className="shrink-0 mt-0.5" />
          <p className="font-bold">{success}</p>
        </div>
      )}

      <div className="glass-card border border-white/60 rounded-3xl p-6 shadow-floating bg-white/40 backdrop-blur-xl space-y-6">
        <LeadFormFields
          form={form}
          onChange={handleChange}
          sellers={sellers}
          isVendedor={isVendedor}
          isAdm={isAdm}
          userName={user?.nome}
        />
      </div>

      {/* Footer — Botões */}
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <button onClick={() => router.push('/crm/leads')} className="flex-1 py-3 font-bold text-xs text-slate-400 border border-slate-200 rounded-2xl hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-95 shadow-sm uppercase tracking-tight">
          Cancelar
        </button>
        <button onClick={handleSave} disabled={saving} className="flex-1 bg-linear-to-r from-sky-500 to-sky-600 text-white py-3 rounded-2xl hover:shadow-sky-500/40 hover:shadow-2xl transition-all font-black text-xs disabled:opacity-50 flex justify-center items-center gap-2 shadow-xl shadow-sky-900/10 active:scale-95 uppercase tracking-tight">
          {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : <><Save size={14} /> Salvar Alterações</>}
        </button>
        <button onClick={() => router.push(`/crm/oportunidade-de-negocio?leadId=${leadId}`)} className="flex-1 bg-linear-to-r from-violet-500 to-violet-600 text-white py-3 rounded-2xl hover:shadow-violet-500/40 hover:shadow-2xl transition-all font-black text-xs flex justify-center items-center gap-2 shadow-xl shadow-violet-900/10 active:scale-95 uppercase tracking-tight">
          <Briefcase size={14} /> Nova Oportunidade
        </button>
      </div>
      <ConfirmDialog {...confirmProps} />
    </div>
  );
}
