'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Edit, Menu, Search, Trash2, Loader2, RefreshCw } from 'lucide-react';
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
            <h1 className="text-2xl font-light text-zinc-100">Gerenciar Equipes</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{equipes.length} equipe{equipes.length !== 1 ? 's' : ''} cadastrada{equipes.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadEquipes} className="p-2.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors" title="Recarregar">
              <RefreshCw size={16} />
            </button>
            <PermissionGate permission="rh:equipes:manage">
              <button
                onClick={() => setModalData({})}
                className="flex items-center gap-2 bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] text-white px-5 py-2.5 rounded-full hover:opacity-90 font-medium shadow-lg shadow-sky-900/20 transition-all text-sm"
              >
                Nova Equipe <Plus size={16} />
              </button>
            </PermissionGate>
          </div>
        </header>

        <div className="bg-[#1c1c1c] border border-zinc-800 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-lg font-medium text-zinc-300 flex items-center gap-3">
              <Users size={20} className="text-[#0ea5e9]" /> Estrutura de Equipes
            </h2>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input
                type="text"
                placeholder="Buscar equipe ou líder..."
                className="w-full bg-[#2a2a2a] text-sm text-zinc-200 pl-10 pr-4 py-2.5 rounded-xl border border-zinc-700 focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] outline-none transition-all placeholder:text-zinc-600"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Estados de loading / erro / vazio */}
          {loading && !modalData ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 size={28} className="animate-spin text-[#0ea5e9]" />
            </div>
          ) : error ? (
            <div className="text-center py-16 text-red-400 text-sm">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Users size={40} className="mx-auto text-zinc-700 mb-4" />
              <p className="text-zinc-500 text-sm">
                {search ? 'Nenhuma equipe corresponde à busca.' : 'Nenhuma equipe cadastrada ainda.'}
              </p>
              {!search && (
                <button onClick={() => setModalData({})} className="mt-4 text-[#0ea5e9] hover:underline text-sm">
                  Criar primeira equipe
                </button>
              )}
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-400 border-collapse">
                <thead className="border-b border-zinc-800 text-zinc-100">
                  <tr>
                    <th className="pb-4 font-semibold px-2">Nome da Equipe</th>
                    <th className="pb-4 font-semibold px-2">Líder</th>
                    <th className="pb-4 font-semibold px-2 text-center">Membros</th>
                    <th className="pb-4 font-semibold px-2">Filial</th>
                    <th className="pb-4 font-semibold px-2">Status</th>
                    <th className="pb-4 font-semibold px-2 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((equipe) => (
                    <tr key={equipe.id} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors">
                      <td className="py-4 px-2 font-medium text-zinc-200">{equipe.nome}</td>
                      <td className="py-4 px-2">
                        {equipe.lider ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-[11px] text-white font-bold shrink-0">
                              {equipe.lider.nome.charAt(0).toUpperCase()}
                            </div>
                            <span>{equipe.lider.nome}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-600 italic text-xs">Sem líder</span>
                        )}
                      </td>
                      <td className="py-4 px-2 text-center">
                        <span className="bg-[#2a2a2a] text-zinc-300 px-3 py-1 rounded-lg border border-zinc-700 font-medium">
                          {equipe.membros?.length ?? 0}
                        </span>
                      </td>
                      <td className="py-4 px-2 truncate max-w-[150px]" title={equipe.filial?.nome}>
                        {equipe.filial?.nome ?? <span className="text-zinc-600 italic text-xs">—</span>}
                      </td>
                      <td className="py-4 px-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${equipe.ativo ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                          {equipe.ativo ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="py-4 px-2">
                        <PermissionGate permission="rh:equipes:manage">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => openEditModal(equipe.id)}
                              className="text-zinc-500 hover:text-[#0ea5e9] transition-colors p-1.5 hover:bg-zinc-800 rounded-lg" title="Editar">
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(equipe.id, equipe.nome)}
                              className="text-zinc-500 hover:text-red-400 transition-colors p-1.5 hover:bg-zinc-800 rounded-lg" title="Remover">
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
