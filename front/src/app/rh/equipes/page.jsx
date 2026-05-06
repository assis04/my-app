'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Edit, Search, Trash2, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import EquipeModal from './components/EquipeModal';
import { PermissionGate } from '@/components/PermissionGate';
import { usePermissions } from '@/hooks/usePermissions';

export default function Equipes() {
  const { user, loading: authLoading } = useAuth();
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
    <>
        <header className="flex justify-between items-center mb-6 pb-4 border-b border-(--border)">
          <div>
            <h1 className="text-2xl font-black text-(--text-primary) tracking-tight">Gestão de Equipes</h1>
            <p className="text-xs text-(--text-secondary) mt-0.5 font-bold tracking-wider">{equipes.length} equipe{equipes.length !== 1 ? 's' : ''} estratégica{equipes.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-3">
            <PermissionGate permission="rh:equipes:manage">
              <button
                onClick={() => setModalData({})}
                className="flex items-center gap-2 bg-(--gold) text-(--on-gold) px-5 py-2 rounded-full  hover:shadow-xl font-bold shadow-lg transition-all text-sm active:scale-95 whitespace-nowrap"
              >
                Nova Equipe <Plus size={16} />
              </button>
            </PermissionGate>
          </div>
        </header>

        <div className="glass-card border border-(--border-subtle) rounded-3xl p-4 md:p-6 shadow-floating mb-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <h2 className="text-base font-black text-(--text-primary) flex items-center gap-3">
              <div className="w-8 h-8 bg-(--gold-soft) rounded-xl flex items-center justify-center border border-(--gold-soft) shadow-sm">
                <Users size={18} className="text-(--gold)" />
              </div>
              Equipes
            </h2>
            <div className="relative w-full lg:w-72 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-(--text-muted) group-focus-within:text-(--gold) transition-colors" size={16} />
              <input
                type="text"
                placeholder="Filtrar por nome ou líder..."
                className="w-full bg-(--surface-1) text-sm text-(--text-primary) pl-11 pr-4 py-2.5 rounded-2xl border border-(--border) focus:border-(--gold) focus:ring-4 focus:ring-(--gold)/10 outline-none transition-all font-bold placeholder:text-(--text-muted) placeholder:font-medium"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Estados de loading / erro / vazio */}
          {loading && !modalData ? (
            <div className="flex justify-center items-center py-20 bg-(--surface-1)/10 rounded-2xl border border-dashed border-(--border-subtle)">
              <Loader2 size={32} className="animate-spin text-(--gold)" />
            </div>
          ) : error ? (
            <div className="text-center py-16 bg-(--danger-soft) rounded-2xl border border-(--danger)/30 text-(--danger) font-bold flex items-center justify-center gap-3 text-sm">
              <AlertTriangle size={18} /> {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-(--surface-1)/10 rounded-2xl border border-dashed border-(--border-subtle) group">
              <Users size={40} className="mx-auto text-(--text-faint) mb-4 group-hover:text-(--gold-soft) transition-colors" />
              <p className="text-(--text-muted) font-bold text-xs">
                {search ? 'Nenhum resultado encontrado.' : 'Nenhuma equipe estruturada.'}
              </p>
            </div>
          ) : (
            <div className="w-full overflow-hidden rounded-2xl border border-(--border-subtle)">
              <table className="w-full text-left text-sm whitespace-nowrap text-(--text-secondary) border-collapse">
                <thead className="bg-(--surface-1)/80 text-(--text-secondary) font-black text-xs border-b border-(--border-subtle) italic tracking-tight">
                  <tr>
                    <th className="py-2 px-4 italic">Identificação</th>
                    <th className="py-2 px-4 italic">Lider</th>
                    <th className="py-2 px-4 text-center italic">Membros</th>
                    <th className="py-2 px-4 italic">Filial</th>
                    <th className="py-2 px-4 italic">Status</th>
                    <th className="py-2 px-4 text-right italic">Controle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border-subtle)">
                  {filtered.map((equipe) => (
                    <tr key={equipe.id} className="hover:bg-(--surface-1) transition-all group">
                      <td className="py-2 px-4 font-black text-(--text-primary) group-hover:text-(--gold-hover) transition-colors tracking-tight">{equipe.nome}</td>
                      <td className="py-2 px-4">
                        {equipe.lider ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-(--gold) flex items-center justify-center text-xs text-(--on-gold) font-black shadow-sm group-hover:scale-110 transition-transform">
                              {equipe.lider.nome.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-(--text-primary) tracking-tight">{equipe.lider.nome}</span>
                          </div>
                        ) : (
                          <span className="text-(--text-muted) font-bold text-xs italic tracking-tight">Sem Líder</span>
                        )}
                      </td>
                      <td className="py-2 px-4 text-center">
                        <span className="bg-(--surface-1) text-(--text-muted) px-3 py-0.5 rounded-xl border border-(--border-subtle) font-black text-xs shadow-xs group-hover:bg-(--gold-soft) group-hover:text-(--gold) group-hover:border-(--gold-soft) transition-all">
                          {equipe.membros?.length ?? 0} Integrantes
                        </span>
                      </td>
                      <td className="py-2 px-4">
                        <span className="font-bold text-(--text-muted) text-xs tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px] inline-block">
                          {equipe.filial?.nome ?? 'Global'}
                        </span>
                      </td>
                      <td className="py-2 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-black border shadow-sm tracking-tight ${equipe.ativo ? 'bg-(--success-soft) text-(--success) border-(--success)/30' : 'bg-(--danger-soft) text-(--danger) border-(--danger)/30'}`}>
                          {equipe.ativo ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="py-2 px-4">
                        <PermissionGate permission="rh:equipes:manage">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => openEditModal(equipe.id)}
                              className="p-1.5 text-(--text-muted) hover:text-(--gold) hover:bg-(--gold-soft) rounded-xl transition-all border border-transparent hover:border-(--gold-soft) shadow-sm active:scale-95" title="Editar">
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(equipe.id, equipe.nome)}
                              className="p-1.5 text-(--text-muted) hover:text-(--danger) hover:bg-(--danger-soft) rounded-xl transition-all border border-transparent hover:border-(--danger)/30 shadow-sm active:scale-95" title="Remover">
                              <Trash2 size={14} />
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
      {modalData !== null && (
        <EquipeModal
          equipe={modalData?.id ? modalData : null}
          onClose={() => setModalData(null)}
          onRefresh={loadEquipes}
        />
      )}
    </>
  );
}
