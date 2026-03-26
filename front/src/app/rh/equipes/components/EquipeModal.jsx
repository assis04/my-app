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
        setUsers(usersData);
        setFiliais(filiaisData);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/10 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white/95 backdrop-blur-xl border border-white/40 w-full max-w-4xl rounded-2xl shadow-floating flex flex-col max-h-[92vh] overflow-hidden translate-y-0 transform transition-all page-transition">

        {/* Header */}
        <div className="flex justify-between items-center p-8 border-b border-slate-100 shrink-0">
          <h2 className="text-xl sm:text-3xl font-black tracking-tight flex items-center gap-4 text-slate-900">
            <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center border border-sky-100 shadow-sm">
              <UsersIcon size={24} className="text-sky-600" />
            </div>
            {isEditing ? 'Ajustar Equipe' : 'Estruturar Equipe'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 transition-all bg-slate-50 hover:bg-slate-100 p-2.5 rounded-full cursor-pointer border border-slate-100 flex items-center justify-center active:scale-90">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-8 space-y-8 bg-white custom-scrollbar">
          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl text-sm font-bold flex items-start gap-3 shadow-sm">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Nome e Descrição */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2 focus-within:scale-[1.01] transition-transform">
              <label className="text-xs font-bold text-slate-400 ml-1">Identificação da Equipe *</label>
              <input
                required type="text" placeholder="Ex: Comercial Sul"
                className="w-full bg-slate-50 text-slate-900 p-3 rounded-2xl border border-slate-200 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all font-black placeholder:text-slate-300 text-sm"
                value={formData.nome}
                onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-2 focus-within:scale-[1.01] transition-transform">
              <label className="text-xs font-bold text-slate-400 ml-1">Objetivo / Descrição</label>
              <input
                type="text" placeholder="Foco em prospecção..."
                className="w-full bg-slate-50 text-slate-900 p-4 rounded-2xl border border-slate-200 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all font-bold placeholder:text-slate-300 text-sm"
                value={formData.descricao}
                onChange={e => setFormData(p => ({ ...p, descricao: e.target.value }))}
              />
            </div>
          </div>

          {/* Líder, Filial, e Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 ml-1">Liderança</label>
              <PremiumSelect 
                placeholder="Nenhum líder"
                options={users}
                value={formData.liderId}
                onChange={e => setFormData(p => ({ ...p, liderId: e.target.value }))}
                className={loadingDeps ? 'opacity-50 pointer-events-none' : ''}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 ml-1">Unidade</label>
              <PremiumSelect 
                placeholder="Unidade Global"
                options={filiais}
                value={formData.filialId}
                onChange={e => setFormData(p => ({ ...p, filialId: e.target.value }))}
                className={loadingDeps ? 'opacity-50 pointer-events-none' : ''}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 ml-1">Operante</label>
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
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <label className="text-sm font-bold text-slate-800">Contingente da Equipe</label>
              <span className="text-xs font-semibold text-sky-600 bg-sky-50 px-3 py-1 rounded-full border border-sky-100 shadow-sm">
                {formData.membroIds.length} Ativos
              </span>
            </div>

            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-sky-500 transition-colors" size={16} />
              <input
                type="text" placeholder="Filtrar por nome..."
                className="w-full bg-slate-50 text-sm text-slate-900 pl-12 pr-6 py-3 rounded-2xl border border-slate-200 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all font-bold placeholder:text-slate-300"
                value={searchMembro}
                onChange={e => setSearchMembro(e.target.value)}
              />
            </div>

            <div className="max-h-56 overflow-y-auto custom-scrollbar rounded-2xl border border-slate-200 bg-slate-50/50 p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {loadingDeps ? (
                <div className="col-span-full flex justify-center py-10">
                  <Loader2 size={32} className="animate-spin text-sky-500" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="col-span-full text-center py-10">
                   <p className="text-slate-400 font-medium text-sm">Nenhum colaborador localizado.</p>
                </div>
              ) : filteredUsers.map(u => {
                const selected = formData.membroIds.includes(u.id);
                return (
                  <label
                    key={u.id}
                    onClick={() => toggleMembro(u.id)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all rounded-xl select-none border border-transparent group ${selected ? 'bg-white shadow-sm border-slate-100' : 'hover:bg-white/60'}`}
                  >
                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${selected ? 'bg-sky-500 border-sky-500 shadow-sky-100 shadow-sm' : 'bg-white border-slate-200 group-hover:border-slate-300'}`}>
                      {selected && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-[10px] text-slate-600 font-black shrink-0 transition-transform group-hover:scale-110">
                      {u.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-800 font-black truncate">{u.nome}</p>
                      <p className="text-[10px] text-slate-400 font-bold truncate">{u.email}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-4 p-8 border-t border-slate-100 shrink-0 bg-slate-50/50">
          <button type="button" onClick={onClose}
            className="flex-1 py-3 font-bold text-xs border border-slate-200 text-slate-400 rounded-2xl hover:bg-white hover:text-slate-600 transition-all active:scale-95 shadow-sm">
            Retornar
          </button>
          <button type="button" disabled={loading} onClick={handleSubmit}
            className="flex-2 bg-linear-to-br from-sky-400 to-sky-600 text-white py-2.5 rounded-2xl hover:shadow-sky-200/50 hover:shadow-xl transition-all font-bold text-sm shadow-lg shadow-sky-900/10 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-3 active:scale-95 whitespace-nowrap">
            {loading ? <><Loader2 size={18} className="animate-spin" /> Processando...</> : (
              <>{isEditing ? 'Confirmar Atualização' : 'Efetivar Estrutura'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
