'use client';

import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { Loader2, Users as UsersIcon, AlertTriangle, Search } from 'lucide-react';
import PremiumSelect from '@/components/ui/PremiumSelect';

export default function EquipeModal({ equipe = null, onClose, onRefresh }) {
  const isEditing = !!equipe;

  const [formData, setFormData] = useState({
    nome: equipe?.nome || '',
    descricao: equipe?.descricao || '',
    liderId: equipe?.lider?.id || '',
    filialId: equipe?.filial?.id || '',
    ativo: equipe?.ativo ?? true,
    membroIds: equipe?.membros?.map(m => m.id) || [],
  });

  const [users, setUsers] = useState([]);
  const [filiais, setFiliais] = useState([]);
  const [loadingDeps, setLoadingDeps] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchMembro, setSearchMembro] = useState('');

  useEffect(() => {
    const loadDeps = async () => {
      try {
        const [usersData, filiaisData] = await Promise.all([
          api('/users'),
          api('/filiais'),
        ]);
        setUsers(usersData?.data ?? (Array.isArray(usersData) ? usersData : []));
        setFiliais(filiaisData?.data ?? (Array.isArray(filiaisData) ? filiaisData : []));
      } catch (err) {
        setError('Erro ao carregar usuários e filiais.');
      } finally {
        setLoadingDeps(false);
      }
    };
    loadDeps();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.nome) { setError('O nome da equipe é obrigatório.'); return; }
    setLoading(true);

    const payload = {
      nome: formData.nome,
      descricao: formData.descricao || null,
      liderId: formData.liderId || null,
      filialId: formData.filialId || null,
      ativo: formData.ativo,
      membroIds: formData.membroIds,
    };

    try {
      if (isEditing) {
        await api(`/equipes/${equipe.id}`, { method: 'PUT', body: payload });
      } else {
        await api('/equipes', { body: payload });
      }
      onRefresh();
      onClose();
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Erro ao salvar equipe. O nome já existe?');
    } finally {
      setLoading(false);
    }
  };

  const toggleMembro = (userId) => {
    setFormData(prev => ({
      ...prev,
      membroIds: prev.membroIds.includes(userId)
        ? prev.membroIds.filter(id => id !== userId)
        : [...prev.membroIds, userId],
    }));
  };

  const filteredUsers = users.filter(u =>
    u.nome.toLowerCase().includes(searchMembro.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-(--surface-4)/10 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-(--surface-2)/95 backdrop-blur-xl border border-(--border-subtle) w-full max-w-4xl rounded-2xl shadow-floating flex flex-col max-h-[92vh] overflow-hidden translate-y-0 transform transition-all page-transition">

        {/* Header */}
        <div className="flex justify-between items-center p-8 border-b border-(--border-subtle) shrink-0">
          <h2 className="text-xl sm:text-3xl font-black tracking-tight flex items-center gap-4 text-(--text-primary)">
            <div className="w-12 h-12 bg-(--gold-soft) rounded-2xl flex items-center justify-center border border-(--gold-soft) shadow-sm">
              <UsersIcon size={24} className="text-(--gold)" />
            </div>
            {isEditing ? 'Ajustar Equipe' : 'Estruturar Equipe'}
          </h2>
          <button onClick={onClose} className="text-(--text-muted) hover:text-(--text-primary) transition-all bg-(--surface-1) hover:bg-(--surface-3) p-2.5 rounded-full cursor-pointer border border-(--border-subtle) flex items-center justify-center active:scale-90">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-8 space-y-8 bg-(--surface-2) custom-scrollbar">
          {error && (
            <div className="bg-(--danger-soft) border border-(--danger)/30 text-(--danger) p-4 rounded-2xl text-base font-bold flex items-start gap-3 shadow-sm">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Nome e Descrição */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2 focus-within:scale-[1.01] transition-transform">
              <label className="text-sm font-bold text-(--text-muted) ml-1">Identificação da Equipe *</label>
              <input
                required type="text" placeholder="Ex: Comercial Sul"
                className="w-full bg-(--surface-1) text-(--text-primary) p-3 rounded-2xl border border-(--border) outline-none focus:border-(--gold) focus:ring-4 focus:ring-(--gold)/10 transition-all font-medium placeholder:text-(--text-muted) text-base"
                value={formData.nome}
                onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-2 focus-within:scale-[1.01] transition-transform">
              <label className="text-sm font-bold text-(--text-muted) ml-1">Objetivo / Descrição</label>
              <input
                type="text" placeholder="Foco em prospecção..."
                className="w-full bg-(--surface-1) text-(--text-primary) p-4 rounded-2xl border border-(--border) outline-none focus:border-(--gold) focus:ring-4 focus:ring-(--gold)/10 transition-all font-bold placeholder:text-(--text-muted) text-base"
                value={formData.descricao}
                onChange={e => setFormData(p => ({ ...p, descricao: e.target.value }))}
              />
            </div>
          </div>

          {/* Líder, Filial, e Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-(--text-muted) ml-1">Liderança</label>
              <PremiumSelect 
                placeholder="Nenhum líder"
                options={users}
                value={formData.liderId}
                onChange={e => setFormData(p => ({ ...p, liderId: e.target.value }))}
                className={loadingDeps ? 'opacity-50 pointer-events-none' : ''}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-(--text-muted) ml-1">Unidade</label>
              <PremiumSelect 
                placeholder="Unidade Global"
                options={filiais}
                value={formData.filialId}
                onChange={e => setFormData(p => ({ ...p, filialId: e.target.value }))}
                className={loadingDeps ? 'opacity-50 pointer-events-none' : ''}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-(--text-muted) ml-1">Operante</label>
              <PremiumSelect 
                options={[
                  { id: 'true', nome: 'Sim (Ativa)' },
                  { id: 'false', nome: 'Não (Backup)' }
                ]}
                value={formData.ativo.toString()}
                onChange={e => setFormData(p => ({ ...p, ativo: e.target.value === 'true' }))}
              />
            </div>
          </div>

          {/* Membros */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-(--border-subtle)">
              <label className="text-base font-bold text-(--text-primary)">Contingente da Equipe</label>
              <span className="text-sm font-semibold text-(--gold) bg-(--gold-soft) px-3 py-1 rounded-full border border-(--gold-soft) shadow-sm">
                {formData.membroIds.length} Ativos
              </span>
            </div>

            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-(--text-muted) group-focus-within:text-(--gold) transition-colors" size={16} />
              <input
                type="text" placeholder="Filtrar por nome..."
                className="w-full bg-(--surface-1) text-base text-(--text-primary) pl-12 pr-6 py-3 rounded-2xl border border-(--border) outline-none focus:border-(--gold) focus:ring-4 focus:ring-(--gold)/10 transition-all font-bold placeholder:text-(--text-muted)"
                value={searchMembro}
                onChange={e => setSearchMembro(e.target.value)}
              />
            </div>

            <div className="max-h-56 overflow-y-auto custom-scrollbar rounded-2xl border border-(--border) bg-(--surface-1)/50 p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {loadingDeps ? (
                <div className="col-span-full flex justify-center py-10">
                  <Loader2 size={32} className="animate-spin text-(--gold)" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="col-span-full text-center py-10">
                   <p className="text-(--text-muted) font-medium text-base">Nenhum colaborador localizado.</p>
                </div>
              ) : filteredUsers.map(u => {
                const selected = formData.membroIds.includes(u.id);
                return (
                  <label
                    key={u.id}
                    onClick={() => toggleMembro(u.id)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all rounded-xl select-none border border-transparent group ${selected ? 'bg-(--surface-2) shadow-sm border-(--border-subtle)' : 'hover:bg-(--surface-2)/60'}`}
                  >
                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${selected ? 'bg-(--gold) border-(--gold) shadow-sm' : 'bg-(--surface-2) border-(--border) group-hover:border-(--border)'}`}>
                      {selected && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-(--surface-3) flex items-center justify-center text-xs text-(--text-secondary) font-semibold shrink-0 transition-transform group-hover:scale-110">
                      {u.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-(--text-primary) font-semibold truncate">{u.nome}</p>
                      <p className="text-xs text-(--text-muted) font-bold truncate">{u.email}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-4 p-8 border-t border-(--border-subtle) shrink-0 bg-(--surface-1)/50">
          <button type="button" onClick={onClose}
            className="flex-1 py-3 font-bold text-sm border border-(--border) text-(--text-muted) rounded-2xl hover:bg-(--surface-2) hover:text-(--text-secondary) transition-all active:scale-95 shadow-sm">
            Retornar
          </button>
          <button type="button" disabled={loading} onClick={handleSubmit}
            className="flex-2 bg-(--gold) text-(--on-gold) py-2.5 rounded-2xl  hover:shadow-xl transition-all font-bold text-base shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-3 active:scale-95 whitespace-nowrap">
            {loading ? <><Loader2 size={18} className="animate-spin" /> Processando...</> : (
              <>{isEditing ? 'Confirmar Atualização' : 'Efetivar Estrutura'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
