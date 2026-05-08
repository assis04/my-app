'use client';

import { useState, useEffect } from 'react';
import { Shield, Plus, Edit, Loader2, Trash2, AlertTriangle, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import RoleModal from './components/RoleModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';
import { PermissionGate } from '@/components/PermissionGate';
import { usePermissions } from '@/hooks/usePermissions';

export default function GerenciarPerfis() {
  const { user, loading: authLoading } = useAuth();
  const [modalData, setModalData] = useState(null); // null = fechado, {} = novo, { id, ... } = editar
  const [rolesList, setRolesList] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const { can, isAdmin } = usePermissions();
  const { confirm, confirmProps } = useConfirm();

  const router = useRouter();

  const fetchRoles = async () => {
    try {
      setLoadingRoles(true);
      const data = await api('/roles');
      setRolesList(data);
    } catch (error) {
      console.error("Erro ao buscar perfis:", error);
    } finally {
      setLoadingRoles(false);
    }
  };

  const handleDelete = (id, nome) => {
    if (nome === 'ADM') {
      setErrorMsg('Não é possível excluir o perfil ADM.');
      return;
    }
    confirm({
      title: 'Remover Perfil',
      message: `Tem certeza que deseja remover o perfil "${nome}"? Isso não será possível se ele tiver usuários atrelados.`,
      confirmLabel: 'Remover',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api(`/roles/${id}`, { method: 'DELETE' });
          await fetchRoles();
        } catch (error) {
          setErrorMsg(typeof error === 'string' ? error : 'Erro ao excluir perfil. Verifique se ele não possui usuários ativos.');
        }
      },
    });
  };


  useEffect(() => {
    if (!authLoading && user) {
      if (!can('rh:perfis:read')) {
        router.push('/');
      } else {
        fetchRoles();
      }
    }
  }, [authLoading, user, router, can]);

  if (authLoading || !user) return null;

  return (
    <>
        <header className="flex justify-between items-center mb-6 pb-4 border-b border-(--border)">
          <div>
            <h1 className="text-2xl font-black text-(--text-primary) tracking-tight">Gestão de Perfis</h1>
            <p className="text-xs text-(--text-secondary) mt-0.5 font-bold tracking-wider">Definição de papéis e níveis de acesso</p>
          </div>
          <PermissionGate permission="rh:perfis:create">
            <button 
              onClick={() => setModalData({})}
              className="flex items-center gap-2 bg-(--gold) text-(--on-gold) px-5 py-2.5 rounded-full  hover:shadow-xl font-bold shadow-lg transition-all text-sm active:scale-95 whitespace-nowrap"
            >
              Criar Novo Perfil <Plus size={16} />
            </button>
          </PermissionGate>
        </header>

        <div className="glass-card border border-(--border-subtle) rounded-3xl p-4 md:p-6 shadow-floating mb-6">
          <h2 className="text-base font-black text-(--text-primary) flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-(--gold-soft) rounded-xl flex items-center justify-center border border-(--gold-soft) shadow-sm">
              <Shield size={18} className="text-(--gold)" />
            </div>
            Perfis
          </h2>

          <div className="w-full overflow-hidden rounded-2xl border border-(--border-subtle)">
            {loadingRoles ? (
              <div className="flex justify-center py-16 bg-(--surface-1)/10">
                 <Loader2 size={32} className="animate-spin text-(--gold)" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap text-(--text-secondary) border-collapse">
                  <thead className="bg-(--surface-1)/80 text-(--text-secondary) font-semibold text-[11px] uppercase tracking-wider border-b border-(--border-subtle)">
                    <tr>
                      <th className="py-2 px-4 w-16">REF</th>
                      <th className="py-2 px-4">Identificador</th>
                      <th className="py-2 px-4">Descrição das Atribuições</th>
                      <th className="py-2 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border-subtle)">
                    {rolesList.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-16 text-(--text-muted) font-bold text-xs">Nenhum perfil configurado.</td>
                      </tr>
                    ) : rolesList.map((role) => (
                      <tr key={role.id} className="hover:bg-(--surface-1) transition-all group">
                        <td className="py-2 px-4 font-black text-(--text-muted) text-xs tracking-tight">#{role.id}</td>
                        <td className="py-2 px-4">
                          <span className="text-xs font-black text-(--gold) bg-(--gold-soft)/50 px-3 py-1 rounded-lg border border-(--gold-soft) shadow-xs group-hover:bg-(--gold) group-hover:text-(--on-gold) transition-all tracking-tight">
                            {role.nome.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2 px-4 font-bold text-(--text-secondary) max-w-xs truncate text-xs tracking-tight">
                          {role.descricao || 'Sem descrição formal.'}
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex justify-end gap-1 text-center">
                            {!((role.nome === 'ADM' || role.nome === 'RH') && !isAdmin) && (
                              <>
                                <PermissionGate permission="rh:perfis:update">
                                  <button
                                    onClick={() => setModalData(role)}
                                    className="p-1.5 text-(--text-muted) hover:text-(--gold) hover:bg-(--gold-soft) rounded-xl transition-all border border-transparent hover:border-(--gold-soft) shadow-sm active:scale-95"
                                    title="Configurar"
                                  >
                                    <Edit size={14} />
                                  </button>
                                </PermissionGate>
                                <PermissionGate permission="rh:perfis:delete">
                                  <button
                                    onClick={() => handleDelete(role.id, role.nome)}
                                    className="p-1.5 text-(--text-muted) hover:text-(--danger) hover:bg-(--danger-soft) rounded-xl transition-all border border-transparent hover:border-(--danger)/30 shadow-sm active:scale-95"
                                    title="Deletar"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </PermissionGate>
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
        </div>
      {modalData !== null && (
        <RoleModal
          role={modalData?.id ? modalData : null}
          onClose={() => setModalData(null)}
          onRefresh={fetchRoles}
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
