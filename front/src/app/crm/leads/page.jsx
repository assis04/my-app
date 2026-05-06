'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, RefreshCw, Edit, Trash2, ArrowRightLeft,
  X, Users, Download, Upload, Route,
  Save, Briefcase, Loader2, AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { getLeads, deleteLead, transferLeads, updateEtapaLote } from '@/services/crmApi';
import { formatPhone } from '@/lib/utils';
import PremiumSelect from '@/components/ui/PremiumSelect';
import { useRouter } from 'next/navigation';
import { isAdmin, isSeller } from '@/lib/roles';
import { useDebounce } from '@/hooks/useDebounce';
import { INITIAL_LEAD_FORM, STATUS_OPTIONS, ETAPA_OPTIONS, validateLeadForm } from '@/lib/leadConstants';
import { requiresAdminToEdit } from '@/lib/leadStatus';
import { CRM_PERMISSIONS, hasPermission } from '@/lib/permissions';
import LeadFormFields from '@/components/crm/LeadFormFields';
import TemperaturaButtons from '@/components/crm/TemperaturaButtons';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';

// ── Modal Novo Lead ──────────────────────────────────────────────────────
function NovoLeadModal({ onClose, onSaved, sellers, user }) {
  const router = useRouter();
  const [form, setForm] = useState(INITIAL_LEAD_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isSeller(user)) {
      setForm(prev => ({ ...prev, preVendedorId: String(user.id) }));
    }
  }, [user]);

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
    if (lead) {
      onSaved();   // Fecha modal + refresh na tabela
    }
  };

  const handleSaveAndOportunidade = async () => {
    const lead = await submitLead();
    if (lead) {
      onClose();
      router.push(`/crm/oportunidade-de-negocio?leadId=${lead.id}`);
    }
  };

  const isVendedor = isSeller(user);
  const isAdm = isAdmin(user);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-(--surface-2) rounded-3xl shadow-floating w-full max-w-[780px] max-h-[90vh] overflow-y-auto border border-(--border-subtle) custom-scrollbar"
        onClick={e => e.stopPropagation()}
      >
        {/* Header do Modal */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-(--border-subtle) sticky top-0 bg-(--surface-2) rounded-t-3xl z-10">
          <div>
            <h2 className="text-lg font-black text-(--text-primary) tracking-tight">Novo Lead</h2>
            <p className="text-sm text-(--text-muted) font-bold mt-0.5">O vínculo com a Conta será feito automaticamente</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-(--surface-3) rounded-xl text-(--text-muted) hover:text-(--text-primary) transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-(--danger-soft) border border-(--danger)/30 text-(--danger) p-3 rounded-2xl text-base flex items-start gap-2 shadow-sm animate-in slide-in-from-top-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <p className="font-bold">{error}</p>
            </div>
          )}

          <LeadFormFields
            form={form}
            onChange={handleChange}
            sellers={sellers}
            isVendedor={isVendedor}
            isAdm={isAdm}
            userName={user?.nome}
          />
        </div>

        {/* Footer do Modal */}
        <div className="flex flex-col sm:flex-row gap-3 p-6 pt-4 border-t border-(--border-subtle) sticky bottom-0 bg-(--surface-2) rounded-b-3xl">
          <button onClick={onClose} className="flex-1 py-3 font-bold text-base text-(--text-muted) border border-(--border) rounded-2xl hover:bg-(--surface-1) hover:text-(--text-primary) transition-all active:scale-95 shadow-sm tracking-tight">
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
    </div>
  );
}

// ── Modal Transferir Responsável ──────────────────────────────────────────
function TransferModal({ onClose, onConfirm, sellers }) {
  const [selectedSeller, setSelectedSeller] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-(--surface-2) rounded-3xl shadow-floating w-full max-w-sm mx-4 p-6 border border-(--border-subtle)" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black text-(--text-primary) tracking-tight">Transferir Responsável</h3>
          <button onClick={onClose} className="p-1 hover:bg-(--surface-3) rounded-xl text-(--text-muted)"><X size={16} /></button>
        </div>
        <PremiumSelect placeholder="Selecione o pré-vendedor..." options={sellers} value={selectedSeller} onChange={e => setSelectedSeller(e.target.value)} />
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 rounded-2xl text-base font-black text-(--text-secondary) hover:bg-(--surface-3) transition-all">Cancelar</button>
          <button onClick={() => { if (selectedSeller) onConfirm(selectedSeller); }} disabled={!selectedSeller} className="px-4 py-2 rounded-2xl text-base font-black text-(--on-gold) bg-(--gold) shadow-lg transition-all active:scale-95 disabled:opacity-50">Confirmar</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Definir Etapa ───────────────────────────────────────────────────
function EtapaModal({ onClose, onConfirm }) {
  const [selectedEtapa, setSelectedEtapa] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-(--surface-2) rounded-3xl shadow-floating w-full max-w-sm mx-4 p-6 border border-(--border-subtle)" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black text-(--text-primary) tracking-tight">Definir Nova Etapa</h3>
          <button onClick={onClose} className="p-1 hover:bg-(--surface-3) rounded-xl text-(--text-muted)"><X size={16} /></button>
        </div>
        <PremiumSelect placeholder="Selecione a etapa..." options={ETAPA_OPTIONS} value={selectedEtapa} onChange={e => setSelectedEtapa(e.target.value)} />
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 rounded-2xl text-base font-black text-(--text-secondary) hover:bg-(--surface-3) transition-all">Cancelar</button>
          <button onClick={() => { if (selectedEtapa) onConfirm(selectedEtapa); }} disabled={!selectedEtapa} className="px-4 py-2 rounded-2xl text-base font-black text-(--on-gold) bg-(--gold) shadow-lg transition-all active:scale-95 disabled:opacity-50">Aplicar</button>
        </div>
      </div>
    </div>
  );
}


// ── Página Principal ──────────────────────────────────────────────────────
export default function LeadsListPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [leads, setLeads] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const [showNovoLead, setShowNovoLead] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showEtapa, setShowEtapa] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { confirm, confirmProps } = useConfirm();

  const debouncedSearch = useDebounce(searchTerm);

  const fetchLeads = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const result = await getLeads({
        search: debouncedSearch.trim() || undefined,
        status: filterStatus || undefined,
        page,
        limit: 50,
      });
      setLeads(result.data);
      setPagination({ page: result.page, totalPages: result.totalPages, total: result.total });
    } catch (err) {
      console.error('Erro ao buscar leads:', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterStatus]);

  useEffect(() => {
    if (!authLoading && user) {
      api('/users/lookup').then(raw => {
        const res = Array.isArray(raw) ? raw : (raw?.data ?? []);
        const list = res
          .filter(u => u.ativo !== false)
          .map(u => ({ id: u.id, nome: u.nome }));
        setSellers(list);
      }).catch(() => {});
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!authLoading && user) fetchLeads();
  }, [authLoading, user, fetchLeads]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === leads.length) setSelectedIds([]);
    else setSelectedIds(leads.map(l => l.id));
  };

  const handleTransfer = async (preVendedorId) => {
    try {
      await transferLeads(selectedIds, preVendedorId);
      setSelectedIds([]);
      setShowTransfer(false);
      await fetchLeads();
    } catch (err) {
      setErrorMsg(err?.message || err || 'Erro ao transferir.');
    }
  };

  const handleEtapa = async (etapa) => {
    try {
      await updateEtapaLote(selectedIds, etapa);
      setSelectedIds([]);
      setShowEtapa(false);
      await fetchLeads();
    } catch (err) {
      setErrorMsg(err?.message || err || 'Erro ao atualizar etapa.');
    }
  };

  const handleDelete = (id, nome) => {
    confirm({
      title: 'Remover Lead',
      message: `Tem certeza que deseja remover o lead "${nome}"?`,
      confirmLabel: 'Remover',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteLead(id);
          await fetchLeads();
        } catch (err) {
          setErrorMsg(err?.message || err || 'Erro ao remover.');
        }
      },
    });
  };

  const handleLeadSaved = () => {
    setShowNovoLead(false);
    fetchLeads();
  };

  const statusColor = (s) => {
    const map = {
      'Prospecção': 'bg-(--gold-soft) border-(--gold-soft) text-(--gold)',
      'Qualificação': 'bg-(--gold-soft) border-(--gold)/30 text-(--gold)',
      'Apresentação': 'bg-(--gold-soft) border-(--gold) text-(--gold)',
      'Negociação': 'bg-(--gold-soft) border-(--gold)/30 text-(--gold)',
      'Fechado': 'bg-(--success-soft) border-(--success)/30 text-(--success)',
      'Perdido': 'bg-(--danger-soft) border-(--danger)/30 text-(--danger)',
    };
    return map[s] || 'bg-(--surface-1) border-(--border-subtle) text-(--text-secondary)';
  };

  if (authLoading) return null;

  return (
    <>
      <div className="mb-4 max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4 border-b border-(--border) pb-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-(--text-primary) tracking-tight">Leads</h1>
            <p className="text-sm text-(--text-muted) font-bold mt-0.5">{pagination.total} registro{pagination.total !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={fetchLeads} className="p-1.5 text-(--text-muted) hover:text-(--gold) hover:bg-(--gold-soft) rounded-xl transition-all border border-transparent hover:border-(--gold-soft) shadow-sm active:scale-95" title="Atualizar">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setShowNovoLead(true)} className="flex items-center gap-2 bg-(--gold) text-(--on-gold) px-4 py-2 rounded-2xl  hover:shadow-2xl font-black shadow-xl transition-all text-sm active:scale-95 whitespace-nowrap tracking-tight">
              Novo Lead <Plus size={14} />
            </button>
          </div>
        </div>

        <div className="glass-card border border-(--border-subtle) rounded-3xl p-4 shadow-floating mb-2 bg-(--surface-2)/40 backdrop-blur-xl">
          {/* Filtros e Ações de Topo */}
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-4 gap-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 w-full xl:w-auto">
              <div className="relative group min-w-[260px]">
                <input type="text" placeholder="Buscar nome, celular, CEP..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-(--surface-2) text-base text-(--text-primary) pl-9 pr-4 h-9 rounded-2xl border border-(--border) focus:border-(--gold) focus:ring-4 focus:ring-(--gold)/5 outline-none transition-all placeholder:text-(--text-muted) font-bold shadow-xs tracking-tight" />
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-muted)" />
              </div>
              <PremiumSelect placeholder="Status" options={STATUS_OPTIONS} value={filterStatus} onChange={e => setFilterStatus(e.target.value)} />
              {filterStatus && (
                <button onClick={() => setFilterStatus('')} className="flex items-center gap-1 text-sm text-(--text-muted) hover:text-(--danger) font-black tracking-tight transition-colors self-center">
                  <X size={12} /> Limpar
                </button>
              )}
            </div>

            {/* Ações de Topo + Ações em Lote */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Importar / Exportar */}
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-sm font-black text-(--text-secondary) bg-(--surface-2) border border-(--border) hover:border-(--success)/40 hover:bg-(--success-soft) hover:text-(--success) transition-all tracking-tight shadow-xs">
                <Upload size={12} /> Importar
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-sm font-black text-(--text-secondary) bg-(--surface-2) border border-(--border) hover:border-(--success)/40 hover:bg-(--success-soft) hover:text-(--success) transition-all tracking-tight shadow-xs">
                <Download size={12} /> Exportar
              </button>

              {selectedIds.length > 0 && (
                <>
                  <span className="text-sm font-black text-(--gold) tracking-tight ml-2">{selectedIds.length} selecionado{selectedIds.length > 1 ? 's' : ''}</span>
                  <button onClick={() => setShowTransfer(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-sm font-black text-(--text-secondary) bg-(--surface-2) border border-(--border) hover:border-(--gold)/40 hover:bg-(--gold-soft) hover:text-(--gold) transition-all tracking-tight shadow-xs">
                    <ArrowRightLeft size={12} /> Transferir
                  </button>
                  <button onClick={() => setShowEtapa(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-sm font-black text-(--text-secondary) bg-(--surface-2) border border-(--border) hover:border-(--gold) hover:bg-(--gold-soft) hover:text-(--gold) transition-all tracking-tight shadow-xs">
                    <Route size={12} /> Definir Etapa
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Tabela */}
          <div className="w-full overflow-hidden rounded-2xl border border-(--border-subtle) bg-(--surface-2)">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-base whitespace-nowrap text-(--text-secondary) border-collapse">
                <thead className="bg-(--surface-1)/50 text-(--text-muted) font-black text-sm tracking-tight italic border-b border-(--border-subtle)">
                  <tr>
                    <th className="py-2 px-3 w-[40px]">
                      <input type="checkbox" checked={selectedIds.length === leads.length && leads.length > 0} onChange={toggleSelectAll}
                        className="w-3.5 h-3.5 rounded accent-sky-500 cursor-pointer" />
                    </th>
                    <th className="py-2 px-3 text-center w-[110px]">Temp</th>
                    <th className="py-2 px-3 text-center w-[50px]">ID</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Etapa</th>
                    <th className="py-2 px-3">Nome</th>
                    <th className="py-2 px-3">Celular</th>
                    <th className="py-2 px-3">CEP</th>
                    <th className="py-2 px-3">Conta</th>
                    <th className="py-2 px-3">Pré-vendedor</th>
                    <th className="py-2 px-3">Origem</th>
                    <th className="py-2 px-3">Data</th>
                    <th className="py-2 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border-subtle)">
                  {loading && leads.length === 0 && (
                    <tr><td colSpan={13} className="py-12 text-center"><p className="text-(--text-muted) font-black text-sm animate-pulse">Carregando...</p></td></tr>
                  )}
                  {!loading && leads.length === 0 && (
                    <tr><td colSpan={13} className="py-12 text-center">
                      <div className="w-10 h-10 bg-(--surface-1) rounded-2xl flex items-center justify-center mx-auto mb-2 border border-(--border-subtle) text-(--text-faint)"><Users size={20} /></div>
                      <p className="text-(--text-muted) font-black text-sm">Nenhum lead encontrado.</p>
                    </td></tr>
                  )}
                  {leads.map(lead => {
                    const tempLocked = requiresAdminToEdit(lead.status) && !hasPermission(user, CRM_PERMISSIONS.EDIT_AFTER_SALE);
                    return (
                    <tr key={lead.id} className="hover:bg-(--gold-soft)/40 transition-all group">
                      <td className="py-1.5 px-3">
                        <input type="checkbox" checked={selectedIds.includes(lead.id)} onChange={() => toggleSelect(lead.id)}
                          className="w-3.5 h-3.5 rounded accent-sky-500 cursor-pointer" />
                      </td>
                      <td className="py-1.5 px-3 text-center" onClick={e => e.stopPropagation()}>
                        <TemperaturaButtons
                          leadId={lead.id}
                          value={lead.temperatura}
                          disabled={tempLocked || lead.status === 'Cancelado'}
                          onChange={(updatedLead) => {
                            setLeads(prev => prev.map(l =>
                              l.id === lead.id ? { ...l, temperatura: updatedLead.temperatura } : l,
                            ));
                          }}
                        />
                      </td>
                      <td className="py-1.5 px-3 text-(--text-muted) text-center text-sm font-black group-hover:text-(--gold) italic transition-colors">#{String(lead.id).padStart(4, '0')}</td>
                      <td className="py-1.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-sm font-black border shadow-xs tracking-tight ${statusColor(lead.status)}`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="py-1.5 px-3">
                        <span className="text-sm font-black text-(--gold) bg-(--gold-soft) px-2 py-0.5 rounded-lg border border-(--gold) tracking-tight">{lead.etapa || lead.etapaJornada || '—'}</span>
                      </td>
                      <td className="py-1.5 px-3">
                        <div className="flex flex-col leading-tight">
                          <span className="text-(--text-primary) text-base font-black group-hover:text-(--gold-hover) transition-colors tracking-tight truncate max-w-[160px]">{lead.nome} {lead.sobrenome || ''}</span>
                        </div>
                      </td>
                      <td className="py-1.5 px-3 text-(--text-secondary) text-sm font-bold">{formatPhone(lead.celular)}</td>
                      <td className="py-1.5 px-3 text-(--text-muted) text-sm font-bold">{lead.cep}</td>
                      <td className="py-1.5 px-3">
                        <span className="text-sm font-black text-(--gold) bg-(--gold-soft) px-2 py-0.5 rounded-lg border border-(--gold-soft) tracking-tight truncate max-w-[100px] block">
                          {lead.conta?.nome || '—'}
                        </span>
                      </td>
                      <td className="py-1.5 px-3">
                        <span className="text-(--text-muted) text-sm font-black bg-(--surface-1) px-2 py-0.5 rounded-lg border border-(--border-subtle) tracking-tight">{lead.preVendedor?.nome || '—'}</span>
                      </td>
                      <td className="py-1.5 px-3">
                        {lead.origemExterna
                          ? <span className="text-sm font-black text-(--gold) bg-(--gold-soft) px-2 py-0.5 rounded-full border border-(--gold)/30 tracking-tight">Externo</span>
                          : <span className="text-sm font-black text-(--text-muted) bg-(--surface-1) px-2 py-0.5 rounded-full border border-(--border-subtle) tracking-tight">{lead.origemCanal || 'Manual'}</span>
                        }
                      </td>
                      <td className="py-1.5 px-3 text-(--text-muted) text-sm font-black tracking-tight italic">
                        {(lead.createdAt || lead.dataCadastro) ? new Date(lead.createdAt || lead.dataCadastro).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="py-1.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => router.push(`/crm/leads/${lead.id}`)} className="p-1 text-(--text-muted) hover:text-(--gold) transition-colors rounded-lg hover:bg-(--gold-soft)" title="Editar"><Edit size={13} /></button>
                          <button onClick={() => handleDelete(lead.id, lead.nome)} className="p-1 text-(--text-muted) hover:text-(--danger) transition-colors rounded-lg hover:bg-(--danger-soft)" title="Remover"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paginação */}
          {pagination.totalPages > 1 && (() => {
            const current = pagination.page;
            const total = pagination.totalPages;
            const pages = [];

            // Always show first page
            pages.push(1);

            // Show ellipsis or pages around current
            if (current > 3) pages.push('...');
            for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
              pages.push(i);
            }
            if (current < total - 2) pages.push('...');

            // Always show last page
            if (total > 1) pages.push(total);

            const startItem = (current - 1) * 50 + 1;
            const endItem = Math.min(current * 50, pagination.total);

            return (
              <div className="flex items-center justify-between px-4 py-3 border-t border-(--border-subtle)">
                <span className="text-sm text-(--text-muted) font-black tracking-tight italic">
                  {startItem}–{endItem} de {pagination.total}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={current <= 1}
                    onClick={() => fetchLeads(current - 1)}
                    className="px-2.5 py-1.5 rounded-xl text-sm font-black text-(--text-secondary) border border-(--border) hover:bg-(--gold-soft) hover:text-(--gold) hover:border-(--gold-soft) transition-all disabled:opacity-30 disabled:pointer-events-none tracking-tight"
                  >
                    Anterior
                  </button>
                  {pages.map((p, i) =>
                    p === '...' ? (
                      <span key={`ellipsis-${i}`} className="px-1.5 text-(--text-muted) text-sm font-black select-none">...</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => fetchLeads(p)}
                        className={`w-8 h-8 rounded-xl text-sm font-black transition-all ${
                          p === current
                            ? 'bg-(--gold) text-(--on-gold) shadow-lg border border-(--gold)'
                            : 'text-(--text-secondary) border border-(--border) hover:bg-(--gold-soft) hover:text-(--gold) hover:border-(--gold-soft)'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    disabled={current >= total}
                    onClick={() => fetchLeads(current + 1)}
                    className="px-2.5 py-1.5 rounded-xl text-sm font-black text-(--text-secondary) border border-(--border) hover:bg-(--gold-soft) hover:text-(--gold) hover:border-(--gold-soft) transition-all disabled:opacity-30 disabled:pointer-events-none tracking-tight"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {errorMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-(--danger-soft) border border-(--danger)/30 text-(--danger) px-4 py-3 rounded-2xl text-base font-bold shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-2">
          <AlertTriangle size={14} />
          {errorMsg}
          <button onClick={() => setErrorMsg('')} className="text-(--danger) hover:text-(--danger) ml-2"><X size={14} /></button>
        </div>
      )}

      {showNovoLead && <NovoLeadModal sellers={sellers} user={user} onClose={() => setShowNovoLead(false)} onSaved={handleLeadSaved} />}
      {showTransfer && <TransferModal sellers={sellers} onClose={() => setShowTransfer(false)} onConfirm={handleTransfer} />}
      {showEtapa && <EtapaModal onClose={() => setShowEtapa(false)} onConfirm={handleEtapa} />}
      <ConfirmDialog {...confirmProps} />
    </>
  );
}
