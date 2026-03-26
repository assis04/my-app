'use client';

import { useState, useEffect, useCallback } from 'react';
import { Building2, Plus, Edit, Trash2, Menu, Search, Loader2, RefreshCw, MapPin, Users, AlertTriangle } from 'lucide-react';
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
  const [viewTeamData, setViewTeamData] = useState(null); // filial para ver equipe

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

  const handleViewTeam = async (id) => {
    try {
      const data = await api(`/filiais/${id}`);
      setViewTeamData(data);
    } catch (err) {
      alert('Erro ao carregar equipe da filial.');
    }
  };

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
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans relative page-transition">
      <button
        className="md:hidden absolute top-4 left-4 z-50 bg-white p-2 rounded-xl border border-slate-200 text-slate-600 shadow-sm transition-all hover:bg-slate-50"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <Menu size={24} />
      </button>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/10 z-30 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <div className={`fixed inset-y-0 left-0 z-40 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <Sidebar />
      </div>

      <main className="flex-1 p-6 md:p-8 overflow-y-auto min-w-0 pt-16 md:pt-8 bg-slate-50">
        <header className="flex justify-between items-center mb-10 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gerenciar Filiais</h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">{filiais.length} filial{filiais.length !== 1 ? 'is' : ''} estratégica{filiais.length !== 1 ? 's' : ''} em operação</p>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <button
                onClick={() => setModalData({})}
                className="flex items-center gap-2 bg-linear-to-r from-sky-500 to-sky-600 text-white px-6 py-2.5 rounded-full hover:shadow-sky-200/50 hover:shadow-xl font-bold shadow-lg shadow-sky-900/10 transition-all text-sm active:scale-95"
              >
                Nova Filial <Plus size={18} />
              </button>
            )}
          </div>
        </header>

        {/* Cards stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12">
          <div className="bg-white border border-slate-100 rounded-2xl p-7 flex items-center gap-6 shadow-premium hover:shadow-floating transition-all active:scale-[0.98] cursor-pointer group">
            <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center border border-sky-100 shadow-sm group-hover:bg-sky-500 group-hover:text-white transition-colors">
              <Building2 size={28} className="text-sky-500 group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900 tracking-tighter">{filiais.length}</p>
              <p className="text-xs font-medium text-slate-400">Unidades Ativas</p>
            </div>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-7 flex items-center gap-6 shadow-premium hover:shadow-floating transition-all active:scale-[0.98] cursor-pointer group">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100 shadow-sm group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <Users size={28} className="text-emerald-500 group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900 tracking-tighter">
                {filiais.reduce((acc, f) => acc + (f._count?.users || 0), 0)}
              </p>
              <p className="text-xs font-medium text-slate-400">Colaboradores</p>
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="glass-card border border-white/60 rounded-3xl p-10 shadow-floating mb-12">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-4">
              <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center border border-sky-100 shadow-sm">
                <Building2 size={22} className="text-sky-500" />
              </div>
              Filiais
            </h2>
            <div className="relative w-full lg:w-80 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Localizar unidade..."
                className="w-full bg-slate-50 text-sm text-slate-900 pl-12 pr-6 py-3.5 rounded-2xl border border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all font-bold placeholder:text-slate-300 placeholder:font-medium"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-24 bg-slate-50/10 rounded-2xl border border-dashed border-slate-100">
              <Loader2 size={40} className="animate-spin text-sky-500" />
            </div>
          ) : error ? (
            <div className="text-center py-20 bg-rose-50 rounded-2xl border border-rose-100 text-rose-600 font-bold flex items-center justify-center gap-3">
              <AlertTriangle size={20} /> {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 bg-slate-50/10 rounded-2xl border border-dashed border-slate-100 group">
              <Building2 size={48} className="mx-auto text-slate-200 mb-6 group-hover:text-sky-200 transition-colors" />
              <p className="text-slate-400 font-medium text-sm">
                {search ? 'Nenhum resultado para os termos informados.' : 'Nenhuma unidade corporativa cadastrada.'}
              </p>
              {!search && (
                <button onClick={() => setModalData({})} className="mt-4 text-sky-600 font-bold text-sm hover:text-sky-700 transition-colors">
                  [ Adicionar Primeira Unidade ]
                </button>
              )}
            </div>
          ) : (
            <div className="w-full overflow-hidden rounded-2xl border border-slate-100">
              <table className="w-full text-left text-sm whitespace-nowrap text-slate-600 border-collapse">
                <thead className="bg-slate-50/80 text-slate-500 font-bold text-xs border-b border-slate-100">
                  <tr>
                    <th className="py-4 px-6">Nome da Filial</th>
                    <th className="py-4 px-6">Gerente</th>
                    <th className="py-4 px-6 text-center">Usuários</th>
                    <th className="py-4 px-6 text-center">Equipes</th>
                    <th className="py-4 px-6">Data de Fundação</th>
                    <th className="py-4 px-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50 transition-all group">
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 group-hover:bg-sky-50 group-hover:border-sky-100 transition-colors shadow-xs">
                            <Building2 size={18} className="text-slate-400 group-hover:text-sky-500 transition-colors" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-slate-900 tracking-tight group-hover:text-sky-700 transition-colors">{f.nome}</span>
                            <span className="text-xs font-medium text-slate-400 truncate max-w-[200px]">{f.endereco || 'Localização Não Informada'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        {f.manager ? (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-slate-400 to-slate-600 flex items-center justify-center text-[10px] text-white font-black group-hover:from-sky-400 group-hover:to-sky-600 transition-all shadow-sm">
                              {f.manager.nome.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{f.manager.nome}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300 font-medium text-xs italic">Gestão Vacante</span>
                        )}
                      </td>
                      <td className="py-5 px-6 text-center">
                        <span className="bg-sky-50 text-sky-600 border border-sky-100 px-4 py-1 rounded-xl text-[11px] font-black group-hover:bg-sky-500 group-hover:text-white transition-all shadow-xs">
                          {f._count?.users ?? 0} Ativos
                        </span>
                      </td>
                      <td className="py-5 px-6 text-center">
                        <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-4 py-1 rounded-xl text-[11px] font-black group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-xs">
                          {f._count?.equipes ?? 0} Células
                        </span>
                      </td>
                      <td className="py-5 px-6">
                        <span className="text-xs font-medium text-slate-400 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                          {new Date(f.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </td>
                      <td className="py-5 px-6">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleViewTeam(f.id)}
                            className="bg-slate-100 text-slate-500 hover:text-white hover:bg-sky-500 border border-slate-200 hover:border-sky-400 px-4 py-2 rounded-xl transition-all text-xs font-bold flex items-center gap-2 shadow-xs active:scale-95"
                          >
                            <Users size={14} /> Ativo
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => setModalData(f)}
                                className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all border border-transparent hover:border-sky-100 shadow-sm active:scale-95" title="Configurar Unidade">
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(f.id, f.nome)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100 shadow-sm active:scale-95" title="Desativar Unidade">
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
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

      {/* Modal de Visualizar Equipe */}
      {viewTeamData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/10 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center p-8 border-b border-slate-100 shrink-0">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-4 text-slate-900">
                <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center border border-sky-100 shadow-sm">
                  <Users size={20} className="text-sky-600" />
                </div>
                {viewTeamData.nome}
              </h2>
              <button onClick={() => setViewTeamData(null)} className="text-slate-400 hover:text-slate-900 transition-all bg-slate-50 hover:bg-slate-100 p-2.5 rounded-full cursor-pointer border border-slate-100 flex items-center justify-center active:scale-90">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-slate-50/20 custom-scrollbar">
              {viewTeamData.users?.length === 0 ? (
                <div className="text-center py-16 group">
                   <Users size={48} className="mx-auto text-slate-100 mb-4 group-hover:text-sky-100 transition-colors" />
                   <p className="text-slate-300 font-medium text-sm">Unidade sem efetivo vinculado.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {viewTeamData.users.map(u => (
                    <div key={u.id} className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between group hover:border-sky-200 hover:shadow-sm transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-black text-slate-400 group-hover:bg-sky-50 group-hover:text-sky-600 group-hover:border-sky-100 transition-all shadow-xs">
                          {u.nome.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-slate-800 text-sm tracking-tight truncate">{u.nome}</p>
                          <p className="text-xs font-medium text-slate-400 truncate">{u.email}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-8 border-t border-slate-100 flex justify-end shrink-0 bg-slate-50/50">
              <button 
                onClick={() => setViewTeamData(null)}
                className="w-full py-3 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-900 border border-slate-200 rounded-2xl transition-all text-sm font-bold shadow-sm active:scale-95"
              >
                Retornar ao Painel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
