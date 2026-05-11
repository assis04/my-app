'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Edit, Search, Trash2, RefreshCw, AlertTriangle, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import EquipeModal from './components/EquipeModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';
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
  const [errorMsg, setErrorMsg] = useState('');
  const { can } = usePermissions();
  const { confirm, confirmProps } = useConfirm();

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

  const handleDelete = (id, nome) => {
    confirm({
      title: 'Remover Equipe',
      message: `Tem certeza que deseja remover a equipe "${nome}"?`,
      confirmLabel: 'Remover',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api(`/equipes/${id}`, { method: 'DELETE' });
          await loadEquipes();
        } catch {
          setErrorMsg('Erro ao remover equipe.');
        }
      },
    });
  };

  const openEditModal = async (id) => {
    setLoading(true);
    try {
      const data = await api(`/equipes/${id}`);
      setModalData(data);
    } catch (err) {
      setErrorMsg('Erro ao carregar detalhes da equipe para edição.');
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

        <div className="mb-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 mb-4">
            <h2 className="text-base font-semibold text-(--text-primary) flex items-center gap-2 tracking-tight">
              <Users size={16} className="text-(--gold)" />
              Equipes
            </h2>
            <div className="relative w-full lg:w-72 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-muted) group-focus-within:text-(--gold) transition-colors" size={14} />
              <input
                type="text"
                placeholder="Filtrar por nome ou líder..."
                className="w-full bg-(--surface-2) text-sm text-(--text-primary) pl-10 pr-4 h-9 rounded-2xl border border-(--border) focus:border-(--gold) focus:ring-4 focus:ring-(--gold)/5 outline-none transition-all font-medium placeholder:text-(--text-muted) shadow-xs"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 text-center py-4 bg-(--danger-soft) rounded-2xl border border-(--danger)/30 text-(--danger) font-medium flex items-center justify-center gap-2 text-sm">
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          <div className="w-full overflow-hidden rounded-2xl border border-(--border-subtle) bg-(--surface-2)">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap text-(--text-secondary) border-collapse">
                <thead className="bg-(--surface-1)/40 text-(--text-faint) font-semibold text-[11px] uppercase tracking-wider border-b border-(--border-subtle)">
                  <tr>
                    <th className="py-2.5 px-4">Identificação</th>
                    <th className="py-2.5 px-4">Líder</th>
                    <th className="py-2.5 px-4 text-center">Membros</th>
                    <th className="py-2.5 px-4">Filial</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Controle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border-subtle)">
                  {loading && !modalData ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={`eqp-skel-${i}`} className="border-b border-(--border-subtle)/50">
                        <td className="py-3 px-4"><span className="block bg-(--surface-3) animate-pulse rounded h-3 w-32" /></td>
                        <td className="py-3 px-4"><span className="block bg-(--surface-3) animate-pulse rounded h-3 w-28" /></td>
                        <td className="py-3 px-4"><span className="block bg-(--surface-3) animate-pulse rounded h-3 w-20 mx-auto" /></td>
                        <td className="py-3 px-4"><span className="block bg-(--surface-3) animate-pulse rounded h-3 w-24" /></td>
                        <td className="py-3 px-4"><span className="block bg-(--surface-3) animate-pulse rounded-full h-4 w-14" /></td>
                        <td className="py-3 px-4"></td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={6} className="py-14 text-center">
                      <div className="w-10 h-10 bg-(--surface-1) rounded-2xl flex items-center justify-center mx-auto mb-3 border border-(--border-subtle) text-(--text-faint)">
                        <Users size={18} />
                      </div>
                      <p className="text-(--text-muted) text-sm font-medium">
                        {search ? 'Nenhum resultado encontrado.' : 'Nenhuma equipe estruturada.'}
                      </p>
                    </td></tr>
                  ) : (
                    filtered.map((equipe) => (
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
                          <span className="text-(--text-muted) font-bold text-xs tracking-tight">Sem Líder</span>
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
                  ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      {modalData !== null && (
        <EquipeModal
          equipe={modalData?.id ? modalData : null}
          onClose={() => setModalData(null)}
          onRefresh={loadEquipes}
        />
      )}
      <ConfirmDialog {...confirmProps} />
      {errorMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-(--danger-soft) border border-(--danger)/30 text-(--danger) px-4 py-3 rounded-2xl text-sm font-medium shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-2">
          <AlertTriangle size={14} />
          {errorMsg}
          <button onClick={() => setErrorMsg('')} className="text-(--danger) hover:text-(--danger) ml-2"><X size={14} /></button>
        </div>
      )}
    </>
  );
}
