'use client';

import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { Loader2, Users as UsersIcon, AlertTriangle } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1a1a1a] border border-zinc-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-zinc-800 shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-3 text-zinc-100">
            <div className="w-9 h-9 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700">
              <UsersIcon size={18} className="text-[#0ea5e9]" />
            </div>
            {isEditing ? 'Editar Equipe' : 'Nova Equipe'}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors hover:bg-zinc-800 p-1.5 rounded-full cursor-pointer text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-5 custom-scrollbar">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3.5 rounded-xl text-sm flex items-start gap-2.5">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Nome e Descrição */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-400">Nome da Equipe *</label>
              <input
                required type="text" placeholder="Ex: Equipe Comercial Alpha"
                className="w-full bg-[#242424] text-white p-3 rounded-xl border border-zinc-700 outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]/50 transition-all placeholder:text-zinc-600 text-sm"
                value={formData.nome}
                onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-400">Descricao</label>
              <input
                type="text" placeholder="Breve descrição..."
                className="w-full bg-[#242424] text-white p-3 rounded-xl border border-zinc-700 outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]/50 transition-all placeholder:text-zinc-600 text-sm"
                value={formData.descricao}
                onChange={e => setFormData(p => ({ ...p, descricao: e.target.value }))}
              />
            </div>
          </div>

          {/* Líder, Filial, e Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-400">Líder da Equipe</label>
              <select
                disabled={loadingDeps}
                className="w-full bg-[#242424] text-white p-3 rounded-xl border border-zinc-700 outline-none focus:border-[#0ea5e9] transition-all text-sm disabled:opacity-50"
                value={formData.liderId}
                onChange={e => setFormData(p => ({ ...p, liderId: e.target.value }))}
              >
                <option value="">Selecione o líder...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-400">Filial</label>
              <select
                disabled={loadingDeps}
                className="w-full bg-[#242424] text-white p-3 rounded-xl border border-zinc-700 outline-none focus:border-[#0ea5e9] transition-all text-sm disabled:opacity-50"
                value={formData.filialId}
                onChange={e => setFormData(p => ({ ...p, filialId: e.target.value }))}
              >
                <option value="">Selecione a filial...</option>
                {filiais.map(f => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-400">Status</label>
              <select
                className="w-full bg-[#242424] text-white p-3 rounded-xl border border-zinc-700 outline-none focus:border-[#0ea5e9] transition-all text-sm"
                value={formData.ativo.toString()}
                onChange={e => setFormData(p => ({ ...p, ativo: e.target.value === 'true' }))}
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>
          </div>

          {/* Membros */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-400">Membros da Equipe</label>
              <span className="text-xs bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded-full border border-zinc-700">
                {formData.membroIds.length} selecionado{formData.membroIds.length !== 1 ? 's' : ''}
              </span>
            </div>

            <input
              type="text" placeholder="Buscar membro..."
              className="w-full bg-[#242424] text-sm text-zinc-300 p-2.5 rounded-xl border border-zinc-700 outline-none focus:border-[#0ea5e9] transition-all placeholder:text-zinc-600"
              value={searchMembro}
              onChange={e => setSearchMembro(e.target.value)}
            />

            <div className="max-h-48 overflow-y-auto custom-scrollbar rounded-xl border border-zinc-800 bg-[#242424] divide-y divide-zinc-800">
              {loadingDeps ? (
                <div className="flex justify-center py-6">
                  <Loader2 size={20} className="animate-spin text-zinc-500" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <p className="text-center text-zinc-600 text-sm py-6">Nenhum usuário encontrado.</p>
              ) : filteredUsers.map(u => {
                const selected = formData.membroIds.includes(u.id);
                return (
                  <label
                    key={u.id}
                    onClick={() => toggleMembro(u.id)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors select-none ${selected ? 'bg-sky-500/10' : 'hover:bg-zinc-800/50'}`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${selected ? 'bg-[#0ea5e9] border-[#0ea5e9]' : 'border-zinc-600'}`}>
                      {selected && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-300 shrink-0">
                      {u.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm text-zinc-200 font-medium">{u.nome}</p>
                      <p className="text-xs text-zinc-500">{u.email}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-zinc-800 shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 py-3 font-medium border border-zinc-700 text-zinc-400 rounded-xl hover:bg-zinc-800 hover:text-zinc-200 transition-colors text-sm">
            Cancelar
          </button>
          <button type="button" disabled={loading} onClick={handleSubmit}
            className="flex-1 bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] text-white py-3 rounded-xl hover:opacity-90 transition-all font-bold shadow-lg shadow-sky-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 text-sm">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : (isEditing ? 'Salvar Alterações' : 'Criar Equipe')}
          </button>
        </div>
      </div>
    </div>
  );
}
