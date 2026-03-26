'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Edit, Menu, Search, Trash2, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/ui/Sidebar';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import EquipeModal from './components/EquipeModal';
import { PermissionGate } from '@/components/PermissionGate';
import { usePermissions } from '@/hooks/usePermissions';

export default function Equipes() {
  const { user, loading: authLoading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  const [equipes, setEquipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modalData, setModalData] = useState(null); // null = fechado, {} = novo, equipe = edição
  const { can } = usePermissions();

  useEffect(() => {
    if (!authLoading && user && !can('rh:equipes:read')) {
      router.push('/');
    }
  }, [authLoading, user, router, can]);

  const loadEquipes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api('/equipes');
      setEquipes(data);
    } catch (err) {
      setError('Erro ao carregar equipes. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user && can('rh:equipes:read')) {
      loadEquipes();
    }
  }, [authLoading, user, loadEquipes, can]);

  const handleDelete = async (id, nome) => {
    if (!confirm(`Tem certeza que deseja remover a equipe "${nome}"?`)) return;
    try {
      await api(`/equipes/${id}`, { method: 'DELETE' });
      await loadEquipes();
    } catch {
      alert('Erro ao remover equipe.');
    }
  };

  const openEditModal = async (id) => {
    setLoading(true);
    try {
      // Fetch full details of the team including members before opening the modal
      const data = await api(`/equipes/${id}`);
      setModalData(data);
    } catch (err) {
      alert('Erro ao carregar detalhes da equipe para edição.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) return null;

  const filtered = equipes.filter(e =>
    e.nome.toLowerCase().includes(search.toLowerCase()) ||
    (e.lider?.nome || '').toLowerCase().includes(search.toLowerCase())
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
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestão de Equipes</h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">{equipes.length} equipe{equipes.length !== 1 ? 's' : ''} estratégica{equipes.length !== 1 ? 's' : ''} operando</p>
          </div>
          <div className="flex items-center gap-3">
            <PermissionGate permission="rh:equipes:manage">
              <button
                onClick={() => setModalData({})}
                className="flex items-center gap-2 bg-linear-to-r from-sky-500 to-sky-600 text-white px-6 py-2.5 rounded-full hover:shadow-sky-200/50 hover:shadow-xl font-bold shadow-lg shadow-sky-900/10 transition-all text-sm active:scale-95"
              >
                Nova Equipe <Plus size={18} />
              </button>
            </PermissionGate>
          </div>
        </header>

        <div className="glass-card border border-white/60 rounded-3xl p-10 shadow-floating mb-12">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-4">
              <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center border border-sky-100 shadow-sm">
                <Users size={22} className="text-sky-500" />
              </div>
              Equipes
            </h2>
            <div className="relative w-full lg:w-80 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Filtrar por nome ou líder..."
                className="w-full bg-slate-50 text-sm text-slate-900 pl-12 pr-6 py-3.5 rounded-2xl border border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all font-bold placeholder:text-slate-300 placeholder:font-medium"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Estados de loading / erro / vazio */}
          {loading && !modalData ? (
            <div className="flex justify-center items-center py-24 bg-slate-50/10 rounded-2xl border border-dashed border-slate-100">
              <Loader2 size={40} className="animate-spin text-sky-500" />
            </div>
          ) : error ? (
            <div className="text-center py-20 bg-rose-50 rounded-2xl border border-rose-100 text-rose-600 font-bold flex items-center justify-center gap-3">
              <AlertTriangle size={20} /> {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 bg-slate-50/10 rounded-2xl border border-dashed border-slate-100 group">
              <Users size={48} className="mx-auto text-slate-200 mb-6 group-hover:text-sky-200 transition-colors" />
              <p className="text-slate-400 font-medium text-sm">
                {search ? 'Nenhum resultado para os termos informados.' : 'Nenhuma equipe estruturada no ecossistema.'}
              </p>
              {!search && (
                <button onClick={() => setModalData({})} className="mt-4 text-sky-600 font-bold text-sm hover:text-sky-700 transition-colors">
                  [ Iniciar Primeira Estrutura ]
                </button>
              )}
            </div>
          ) : (
            <div className="w-full overflow-hidden rounded-2xl border border-slate-100">
              <table className="w-full text-left text-sm whitespace-nowrap text-slate-600 border-collapse">
                <thead className="bg-slate-50/80 text-slate-500 font-bold text-xs border-b border-slate-100">
                  <tr>
                    <th className="py-4 px-6">Identificação da Equipe</th>
                    <th className="py-4 px-6">Lider da Equipe</th>
                    <th className="py-4 px-6 text-center">Membros</th>
                    <th className="py-4 px-6">Filial</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Controle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((equipe) => (
                    <tr key={equipe.id} className="hover:bg-slate-50 transition-all group">
                      <td className="py-5 px-6 font-bold text-slate-900 group-hover:text-sky-700 transition-colors">{equipe.nome}</td>
                      <td className="py-5 px-6">
                        {equipe.lider ? (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-sky-400 to-indigo-600 flex items-center justify-center text-[10px] text-white font-black shadow-sm group-hover:scale-110 transition-transform">
                              {equipe.lider.nome.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-slate-700">{equipe.lider.nome}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300 font-medium text-xs italic">Sem Liderança</span>
                        )}
                      </td>
                      <td className="py-5 px-6 text-center">
                        <span className="bg-slate-100 text-slate-600 px-4 py-1 rounded-xl border border-slate-200 font-black text-xs shadow-xs group-hover:bg-sky-50 group-hover:text-sky-600 group-hover:border-sky-100 transition-all">
                          {equipe.membros?.length ?? 0} Integrantes
                        </span>
                      </td>
                      <td className="py-5 px-6">
                        <span className="font-medium text-slate-400 text-xs whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px] inline-block">
                          {equipe.filial?.nome ?? 'Global / N/A'}
                        </span>
                      </td>
                      <td className="py-5 px-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-semibold border shadow-sm ${equipe.ativo ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                          {equipe.ativo ? 'Operacional' : 'Inativa'}
                        </span>
                      </td>
                      <td className="py-5 px-6">
                        <PermissionGate permission="rh:equipes:manage">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEditModal(equipe.id)}
                              className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all border border-transparent hover:border-sky-100 shadow-sm active:scale-95" title="Editar Configurações">
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(equipe.id, equipe.nome)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100 shadow-sm active:scale-95" title="Dissolver Equipe">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </PermissionGate>
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
        <EquipeModal
          equipe={modalData?.id ? modalData : null}
          onClose={() => setModalData(null)}
          onRefresh={loadEquipes}
        />
      )}
    </div>
  );
}
