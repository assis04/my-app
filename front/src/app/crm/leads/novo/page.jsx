'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Briefcase, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { useRouter } from 'next/navigation';
import { isAdmin, isSeller } from '@/lib/roles';
import { INITIAL_LEAD_FORM, validateLeadForm } from '@/lib/leadConstants';
import LeadFormFields from '@/components/crm/LeadFormFields';

export default function NovoLeadPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(INITIAL_LEAD_FORM);

  useEffect(() => {
    if (!authLoading && user) {
      api('/users/lookup').then(raw => {
        const res = Array.isArray(raw) ? raw : (raw?.data ?? []);
        setSellers(res.filter(u => u.ativo !== false).map(u => ({ id: u.id, nome: u.nome })));
      }).catch(() => {});

      if (isSeller(user)) {
        setForm(prev => ({ ...prev, preVendedorId: String(user.id) }));
      }
    }
  }, [user, authLoading]);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const submitLead = async () => {
    const validationError = validateLeadForm(form);
    if (validationError) { setError(validationError); return null; }

    setError('');
    setLoading(true);
    try {
      // status / etapa não vão no POST — backend força status canônico "Em prospecção"
      // e deriva etapa via STATUS_TO_ETAPA. Ver specs/crm.md §9.3 + leadValidator.js.
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
      const lead = await api('/api/crm/leads', { body: payload });
      return lead;
    } catch (err) {
      setError(err?.message || err || 'Erro ao criar lead.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const lead = await submitLead();
    if (lead) router.push('/crm/leads');
  };

  const handleSaveAndOportunidade = async () => {
    const lead = await submitLead();
    if (lead) router.push(`/crm/oportunidade-de-negocio?leadId=${lead.id}`);
  };

  const isVendedor = isSeller(user);
  const isAdm = isAdmin(user);

  if (authLoading) return null;

  return (
    <div className="mb-4 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 border-b border-(--border) pb-3">
        <button onClick={() => router.push('/crm/leads')} className="p-2 text-(--text-muted) hover:text-(--text-primary) hover:bg-(--surface-1) rounded-xl transition-all">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-(--text-primary) tracking-tight">Novo Lead</h1>
          <p className="text-sm text-(--text-muted) font-bold mt-0.5">O vínculo com a Conta será feito automaticamente</p>
        </div>
      </div>

      {error && (
        <div className="bg-(--danger-soft) border border-(--danger)/30 text-(--danger) p-3 rounded-2xl text-base flex items-start gap-2 shadow-sm mb-4 animate-in slide-in-from-top-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <p className="font-bold">{error}</p>
        </div>
      )}

      <div className="glass-card border border-white/60 rounded-3xl p-6 shadow-floating bg-(--surface-2)/40 backdrop-blur-xl space-y-6">
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
        <button onClick={() => router.push('/crm/leads')} className="flex-1 py-3 font-bold text-base text-(--text-muted) border border-(--border) rounded-2xl hover:bg-(--surface-1) hover:text-(--text-primary) transition-all active:scale-95 shadow-sm tracking-tight">
          Cancelar
        </button>
        <button onClick={handleSave} disabled={loading} className="flex-1 bg-(--gold) text-(--on-gold) py-3 rounded-2xl  hover:shadow-2xl transition-all font-black text-base disabled:opacity-50 flex justify-center items-center gap-2 shadow-xl active:scale-95 tracking-tight">
          {loading ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : <><Save size={14} /> Salvar Lead</>}
        </button>
        <button onClick={handleSaveAndOportunidade} disabled={loading} className="flex-1 bg-(--gold) text-(--on-gold) py-3 rounded-2xl  hover:shadow-2xl transition-all font-black text-base disabled:opacity-50 flex justify-center items-center gap-2 shadow-xl  active:scale-95 tracking-tight">
          {loading ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : <><Briefcase size={14} /> Nova Oportunidade</>}
        </button>
      </div>
    </div>
  );
}
