'use client';

import { useState, useEffect, useCallback } from 'react';
import { Building2, Plus, Edit, Trash2, Menu, Search, Loader2, RefreshCw, MapPin, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/ui/Sidebar';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import FilialModal from './components/FilialModal';
import { usePermissions } from '@/hooks/usePermissions';

const ALLOWED_ROLES = ['ADM', 'Administrador', 'admin', 'RH', 'rh'];

export default function FiliaisPage() {
  const { user, loading: authLoading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const { isAdmin } = usePermissions();

  const [filiais, setFiliais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modalData, setModalData] = useState(null); // null = fechado, {} = novo, filial = edição

  useEffect(() => {
    if (!authLoading && user && !ALLOWED_ROLES.includes(user.role)) {
      router.push('/');
    }
  }, [authLoading, user, router]);

  const loadFiliais = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api('/filiais');
      setFiliais(data);
    } catch (err) {
      setError('Erro ao carregar filiais.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user && ALLOWED_ROLES.includes(user.role)) {
      loadFiliais();
    }
  }, [authLoading, user, loadFiliais]);

  const handleDelete = async (id, nome) => {
    if (!confirm(`Tem certeza que deseja remover a filial "${nome}"?\n\nIsso só é possível se não houver usuários ou equipes vinculados.`)) return;
    try {
      await api(`/filiais/${id}`, { method: 'DELETE' });
      await loadFiliais();
    } catch (err) {
      alert(typeof err === 'string' ? err : 'Erro ao remover filial. Pode haver usuários ou equipes vinculados.');
    }
  };

  if (authLoading || !user) return null;

  const filtered = filiais.filter(f =>
    f.nome.toLowerCase().includes(search.toLowerCase()) ||
    (f.endereco || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#212121] text-zinc-100 font-sans relative">
      <button
        className="md:hidden absolute top-4 left-4 z-50 bg-[#1c1c1c] p-2 rounded-xl border border-zinc-800 text-zinc-300"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <Menu size={24} />
      </button>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <div className={`fixed inset-y-0 left-0 z-40 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <Sidebar />
      </div>

      <main className="flex-1 p-6 md:p-8 overflow-y-auto min-w-0 pt-16 md:pt-8">
        <header className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-4">
          <div>
            <h1 className="text-2xl font-light text-zinc-100">Gerenciar Filiais</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{filiais.length} filial{filiais.length !== 1 ? 'is' : ''} cadastrada{filiais.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadFiliais} className="p-2.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors" title="Recarregar">
              <RefreshCw size={16} />
            </button>
            {isAdmin && (
              <button
                onClick={() => setModalData({})}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black px-5 py-2.5 rounded-full font-bold shadow-lg shadow-amber-900/20 transition-all text-sm"
              >
                Nova Filial <Plus size={16} />
              </button>
            )}
          </div>
        </header>

        {/* Cards stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#1c1c1c] border border-zinc-800 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20">
              <Building2 size={18} className="text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-100">{filiais.length}</p>
              <p className="text-xs text-zinc-500">Total de Filiais</p>
            </div>
          </div>
          <div className="bg-[#1c1c1c] border border-zinc-800 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center border border-sky-500/20">
              <Users size={18} className="text-sky-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-100">
                {filiais.reduce((acc, f) => acc + (f._count?.users || 0), 0)}
              </p>
              <p className="text-xs text-zinc-500">Usuários cadastrados</p>
            </div>
          </div>
          <div className="bg-[#1c1c1c] border border-zinc-800 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
              <MapPin size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-100">
                {filiais.filter(f => f.endereco).length}
              </p>
              <p className="text-xs text-zinc-500">Com endereço cadastrado</p>
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-[#1c1c1c] border border-zinc-800 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-lg font-medium text-zinc-300 flex items-center gap-3">
              <Building2 size={20} className="text-amber-400" /> Lista de Filiais
            </h2>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input
                type="text"
                placeholder="Buscar filial..."
                className="w-full bg-[#2a2a2a] text-sm text-zinc-200 pl-10 pr-4 py-2.5 rounded-xl border border-zinc-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 outline-none transition-all placeholder:text-zinc-600"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 size={28} className="animate-spin text-amber-400" />
            </div>
          ) : error ? (
            <div className="text-center py-16 text-red-400 text-sm">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Building2 size={40} className="mx-auto text-zinc-700 mb-4" />
              <p className="text-zinc-500 text-sm">
                {search ? 'Nenhuma filial corresponde à busca.' : 'Nenhuma filial cadastrada ainda.'}
              </p>
              {!search && (
                <button onClick={() => setModalData({})} className="mt-4 text-amber-400 hover:underline text-sm">
                  Criar primeira filial
                </button>
              )}
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-400 border-collapse">
                <thead className="border-b border-zinc-800 text-zinc-100">
                  <tr>
                    <th className="pb-4 font-semibold px-2">Nome</th>
                    <th className="pb-4 font-semibold px-2">Endereço</th>
                    <th className="pb-4 font-semibold px-2 text-center">Usuários</th>
                    <th className="pb-4 font-semibold px-2 text-center">Equipes</th>
                    <th className="pb-4 font-semibold px-2">Criação</th>
                    {isAdmin && <th className="pb-4 font-semibold px-2 text-center">Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f) => (
                    <tr key={f.id} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors">
                      <td className="py-4 px-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                            <Building2 size={14} className="text-amber-400" />
                          </div>
                          <span className="font-medium text-zinc-200">{f.nome}</span>
                        </div>
                      </td>
                      <td className="py-4 px-2 max-w-[200px] truncate" title={f.endereco}>
                        {f.endereco ? (
                          <span className="flex items-center gap-1.5 text-zinc-400">
                            <MapPin size={12} className="shrink-0 text-zinc-600" />
                            {f.endereco}
                          </span>
                        ) : (
                          <span className="text-zinc-600 italic text-xs">Não informado</span>
                        )}
                      </td>
                      <td className="py-4 px-2 text-center">
                        <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2.5 py-1 rounded-lg text-xs font-medium">
                          {f._count?.users ?? 0}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-center">
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-xs font-medium">
                          {f._count?.equipes ?? 0}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-xs text-zinc-500">
                        {new Date(f.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      {isAdmin && (
                        <td className="py-4 px-2">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => setModalData(f)}
                              className="text-zinc-500 hover:text-amber-400 transition-colors p-1.5 hover:bg-zinc-800 rounded-lg" title="Editar">
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(f.id, f.nome)}
                              className="text-zinc-500 hover:text-red-400 transition-colors p-1.5 hover:bg-zinc-800 rounded-lg" title="Remover">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {modalData !== null && (
        <FilialModal
          filial={modalData?.id ? modalData : null}
          onClose={() => setModalData(null)}
          onRefresh={loadFiliais}
        />
      )}
    </div>
  );
}
