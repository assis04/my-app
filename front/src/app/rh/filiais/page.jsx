'use client';

import { useState, useEffect, useCallback } from 'react';
import { Building2, Plus, Edit, Trash2, Search, Loader2, RefreshCw, MapPin, Users, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import FilialModal from './components/FilialModal';
import { usePermissions } from '@/hooks/usePermissions';
import { ADMIN_ROLES, HR_ROLES } from '@/lib/roles';

const ALLOWED_ROLES = [...ADMIN_ROLES, ...HR_ROLES];

export default function FiliaisPage() {
  const { user, loading: authLoading } = useAuth();
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
    <>
        <header className="flex justify-between items-center mb-6 pb-4 border-b border-(--border)">
          <div>
            <h1 className="text-2xl font-black text-(--text-primary) tracking-tight">Gerenciar Filiais</h1>
            <p className="text-xs text-(--text-secondary) mt-0.5 font-bold tracking-wider">{filiais.length} filial{filiais.length !== 1 ? 'is' : ''} estratégica{filiais.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <button
                onClick={() => setModalData({})}
                className="flex items-center gap-2 bg-(--gold) text-(--on-gold) px-5 py-2 rounded-full  hover:shadow-xl font-bold shadow-lg transition-all text-sm active:scale-95 whitespace-nowrap"
              >
                Nova Filial <Plus size={16} />
              </button>
            )}
          </div>
        </header>

        {/* Cards stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-(--surface-2) border border-(--border-subtle) rounded-2xl p-4 flex items-center gap-4 shadow-premium hover:shadow-floating transition-all active:scale-[0.98] cursor-pointer group">
            <div className="w-12 h-12 bg-(--gold-soft) rounded-2xl flex items-center justify-center border border-(--gold-soft) shadow-sm group-hover:bg-(--gold) group-hover:text-(--on-gold) transition-colors">
              <Building2 size={24} className="text-(--gold) group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="text-2xl font-black text-(--text-primary) tracking-tight">{filiais.length}</p>
              <p className="text-xs font-bold text-(--text-muted) tracking-tight">Unidades Ativas</p>
            </div>
          </div>
          <div className="bg-(--surface-2) border border-(--border-subtle) rounded-2xl p-4 flex items-center gap-4 shadow-premium hover:shadow-floating transition-all active:scale-[0.98] cursor-pointer group">
            <div className="w-12 h-12 bg-(--success-soft) rounded-2xl flex items-center justify-center border border-(--success)/30 shadow-sm group-hover:bg-(--success) group-hover:text-white transition-colors">
              <Users size={24} className="text-(--success) group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="text-2xl font-black text-(--text-primary) tracking-tight">
                {filiais.reduce((acc, f) => acc + (f._count?.users || 0), 0)}
              </p>
              <p className="text-xs font-bold text-(--text-muted) tracking-tight">Colaboradores</p>
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="glass-card border border-white/60 rounded-3xl p-4 md:p-6 shadow-floating mb-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <h2 className="text-base font-black text-(--text-primary) flex items-center gap-3">
              <div className="w-8 h-8 bg-(--gold-soft) rounded-xl flex items-center justify-center border border-(--gold-soft) shadow-sm">
                <Building2 size={18} className="text-(--gold)" />
              </div>
              Filiais
            </h2>
            <div className="relative w-full lg:w-72 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-(--text-muted) group-focus-within:text-(--gold) transition-colors" size={16} />
              <input
                type="text"
                placeholder="Localizar unidade..."
                className="w-full bg-(--surface-1) text-sm text-(--text-primary) pl-11 pr-4 py-2.5 rounded-2xl border border-(--border) focus:border-(--gold) focus:ring-4 focus:ring-(--gold)/10 outline-none transition-all font-bold placeholder:text-(--text-muted) placeholder:font-medium"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20 bg-(--surface-1)/10 rounded-2xl border border-dashed border-(--border-subtle)">
              <Loader2 size={32} className="animate-spin text-(--gold)" />
            </div>
          ) : error ? (
            <div className="text-center py-16 bg-(--danger-soft) rounded-2xl border border-(--danger)/30 text-(--danger) font-bold flex items-center justify-center gap-3 text-sm">
              <AlertTriangle size={18} /> {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-(--surface-1)/10 rounded-2xl border border-dashed border-(--border-subtle) group">
              <Building2 size={40} className="mx-auto text-(--text-faint) mb-4 group-hover:text-(--gold-soft) transition-colors" />
              <p className="text-(--text-muted) font-bold text-xs">
                {search ? 'Nenhum resultado encontrado.' : 'Nenhuma unidade cadastrada.'}
              </p>
            </div>
          ) : (
            <div className="w-full overflow-hidden rounded-2xl border border-(--border-subtle)">
              <table className="w-full text-left text-sm whitespace-nowrap text-(--text-secondary) border-collapse">
                <thead className="bg-(--surface-1)/80 text-(--text-secondary) font-black text-xs border-b border-(--border-subtle) italic tracking-tight">
                  <tr>
                    <th className="py-2 px-4 italic">Unidade</th>
                    <th className="py-2 px-4 italic">Gerente</th>
                    <th className="py-2 px-4 text-center italic">Usuários</th>
                    <th className="py-2 px-4 text-center italic">Células</th>
                    <th className="py-2 px-4 italic">Fundação</th>
                    <th className="py-2 px-4 text-right italic">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border-subtle)">
                  {filtered.map((f) => (
                    <tr key={f.id} className="hover:bg-(--surface-1) transition-all group">
                      <td className="py-2 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-(--surface-3) border border-(--border) flex items-center justify-center shrink-0 group-hover:bg-(--gold-soft) group-hover:border-(--gold-soft) transition-colors shadow-xs">
                            <Building2 size={14} className="text-(--text-muted) group-hover:text-(--gold) transition-colors" />
                          </div>
                          <div className="flex flex-col leading-tight">
                            <span className="font-black text-(--text-primary) tracking-tight group-hover:text-(--gold-hover) transition-colors">{f.nome}</span>
                            <span className="text-xs font-bold text-(--text-muted) truncate max-w-[150px] tracking-tight">{f.endereco || 'N/A'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-4">
                        {f.manager ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-(--surface-3) flex items-center justify-center text-xs text-white font-black   transition-all shadow-sm">
                              {f.manager.nome.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-(--text-primary) group-hover:text-(--text-primary) transition-colors tracking-tight">{f.manager.nome}</span>
                          </div>
                        ) : (
                          <span className="text-(--text-muted) font-bold text-xs italic tracking-tight">Vago</span>
                        )}
                      </td>
                      <td className="py-2 px-4 text-center">
                        <span className="bg-(--gold-soft) text-(--gold) border border-(--gold-soft) px-3 py-0.5 rounded-xl text-xs font-black group-hover:bg-(--gold) group-hover:text-(--on-gold) transition-all shadow-xs">
                          {f._count?.users ?? 0}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-center">
                        <span className="bg-(--success-soft) text-(--success) border border-(--success)/30 px-3 py-0.5 rounded-xl text-xs font-black group-hover:bg-(--success) group-hover:text-white transition-all shadow-xs">
                          {f._count?.equipes ?? 0}
                        </span>
                      </td>
                      <td className="py-2 px-4">
                        <span className="text-xs font-bold text-(--text-muted) bg-(--surface-1) px-2 py-0.5 rounded-lg border border-(--border-subtle) tracking-tight">
                          {new Date(f.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </td>
                      <td className="py-2 px-4">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleViewTeam(f.id)}
                            className="bg-(--surface-1) text-(--text-muted) hover:text-(--gold) hover:bg-(--gold-soft) border border-(--border-subtle) hover:border-(--gold)/40 px-3 py-1.5 rounded-xl transition-all text-xs font-black flex items-center gap-1.5 shadow-xs active:scale-95"
                          >
                            <Users size={12} /> Ver
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => setModalData(f)}
                                className="p-1.5 text-(--text-muted) hover:text-(--gold) hover:bg-(--gold-soft) rounded-xl transition-all border border-transparent hover:border-(--gold-soft) shadow-sm active:scale-95" title="Configurar">
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(f.id, f.nome)}
                                className="p-1.5 text-(--text-muted) hover:text-(--danger) hover:bg-(--danger-soft) rounded-xl transition-all border border-transparent hover:border-(--danger)/30 shadow-sm active:scale-95" title="Remover">
                                <Trash2 size={14} />
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
      {modalData !== null && (
        <FilialModal
          filial={modalData?.id ? modalData : null}
          onClose={() => setModalData(null)}
          onRefresh={loadFiliais}
        />
      )}

      {/* Modal de Visualizar Equipe */}
      {viewTeamData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-(--surface-4)/10 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-(--surface-2) border border-(--border) w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center p-8 border-b border-(--border-subtle) shrink-0">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-4 text-(--text-primary)">
                <div className="w-10 h-10 bg-(--gold-soft) rounded-xl flex items-center justify-center border border-(--gold-soft) shadow-sm">
                  <Users size={20} className="text-(--gold)" />
                </div>
                {viewTeamData.nome}
              </h2>
              <button onClick={() => setViewTeamData(null)} className="text-(--text-muted) hover:text-(--text-primary) transition-all bg-(--surface-1) hover:bg-(--surface-3) p-2.5 rounded-full cursor-pointer border border-(--border-subtle) flex items-center justify-center active:scale-90">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-(--surface-1)/20 custom-scrollbar">
              {viewTeamData.users?.length === 0 ? (
                <div className="text-center py-16 group">
                   <Users size={48} className="mx-auto text-(--text-faint) mb-4 group-hover:text-(--gold-soft) transition-colors" />
                   <p className="text-(--text-muted) font-medium text-base">Unidade sem efetivo vinculado.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {viewTeamData.users.map(u => (
                    <div key={u.id} className="bg-(--surface-2) border border-(--border) p-4 rounded-2xl flex items-center justify-between group hover:border-(--gold)/40 hover:shadow-sm transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-(--surface-3) border border-(--border) flex items-center justify-center text-sm font-black text-(--text-muted) group-hover:bg-(--gold-soft) group-hover:text-(--gold) group-hover:border-(--gold-soft) transition-all shadow-xs">
                          {u.nome.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-(--text-primary) text-base tracking-tight truncate">{u.nome}</p>
                          <p className="text-sm font-medium text-(--text-muted) truncate">{u.email}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-8 border-t border-(--border-subtle) flex justify-end shrink-0 bg-(--surface-1)/50">
              <button 
                onClick={() => setViewTeamData(null)}
                className="w-full py-2.5 bg-(--surface-2) hover:bg-(--surface-1) text-(--text-muted) hover:text-(--text-primary) border border-(--border) rounded-2xl transition-all text-base font-bold shadow-sm active:scale-95 whitespace-nowrap"
              >
                Retornar ao Painel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
