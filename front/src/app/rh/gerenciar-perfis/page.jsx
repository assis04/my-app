'use client';

import { useState, useEffect } from 'react';
import { Shield, Plus, Edit, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import RoleModal from './components/RoleModal';
import { PermissionGate } from '@/components/PermissionGate';
import { usePermissions } from '@/hooks/usePermissions';

export default function GerenciarPerfis() {
  const { user, loading: authLoading } = useAuth();
  const [modalData, setModalData] = useState(null); // null = fechado, {} = novo, { id, ... } = editar
  const [rolesList, setRolesList] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const { can, isAdmin } = usePermissions();

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

  const handleDelete = async (id, nome) => {
    if (nome === 'ADM') {
      alert('Não é possível excluir o perfil ADM.');
      return;
    }
    if (!confirm(`Tem certeza que deseja remover o perfil "${nome}"? Isso não será possível se ele tiver usuários atrelados.`)) return;
    try {
      await api(`/roles/${id}`, { method: 'DELETE' });
      await fetchRoles();
    } catch (error) {
      alert(typeof error === 'string' ? error : 'Erro ao excluir perfil. Verifique se ele não possui usuários ativos.');
    }
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
        <header className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Gestão de Perfis</h1>
            <p className="text-xs text-slate-500 mt-0.5 font-bold tracking-wider">Definição de papéis e níveis de acesso</p>
          </div>
          <PermissionGate permission="rh:perfis:create">
            <button 
              onClick={() => setModalData({})}
              className="flex items-center gap-2 bg-linear-to-r from-sky-500 to-sky-600 text-white px-5 py-2.5 rounded-full hover:shadow-sky-200/50 hover:shadow-xl font-bold shadow-lg shadow-sky-900/10 transition-all text-sm active:scale-95 whitespace-nowrap"
            >
              Criar Novo Perfil <Plus size={16} />
            </button>
          </PermissionGate>
        </header>

        <div className="glass-card border border-white/60 rounded-3xl p-4 md:p-6 shadow-floating mb-6">
          <h2 className="text-base font-black text-slate-800 flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-sky-50 rounded-xl flex items-center justify-center border border-sky-100 shadow-sm">
              <Shield size={18} className="text-sky-500" />
            </div>
            Perfis
          </h2>

          <div className="w-full overflow-hidden rounded-2xl border border-slate-100">
            {loadingRoles ? (
              <div className="flex justify-center py-16 bg-slate-50/10">
                 <Loader2 size={32} className="animate-spin text-sky-500" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap text-slate-600 border-collapse">
                  <thead className="bg-slate-50/80 text-slate-500 font-black text-xs border-b border-slate-100 italic tracking-tight">
                    <tr>
                      <th className="py-2 px-4 w-16 italic">REF</th>
                      <th className="py-2 px-4 italic">Identificador</th>
                      <th className="py-2 px-4 italic">Descrição das Atribuições</th>
                      <th className="py-2 px-4 text-right italic">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {rolesList.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-16 text-slate-400 font-bold text-xs">Nenhum perfil configurado.</td>
                      </tr>
                    ) : rolesList.map((role) => (
                      <tr key={role.id} className="hover:bg-slate-50 transition-all group">
                        <td className="py-2 px-4 font-black text-slate-400 text-xs tracking-tight italic">#{role.id}</td>
                        <td className="py-2 px-4">
                          <span className="text-xs font-black text-sky-600 bg-sky-50/50 px-3 py-1 rounded-lg border border-sky-100 shadow-xs group-hover:bg-sky-500 group-hover:text-white transition-all tracking-tight">
                            {role.nome.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2 px-4 font-bold text-slate-500 italic max-w-xs truncate text-xs tracking-tight">
                          {role.descricao || 'Sem descrição formal.'}
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex justify-end gap-1 text-center">
                            {!((role.nome === 'ADM' || role.nome === 'RH') && !isAdmin) && (
                              <>
                                <PermissionGate permission="rh:perfis:update">
                                  <button
                                    onClick={() => setModalData(role)}
                                    className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all border border-transparent hover:border-sky-100 shadow-sm active:scale-95"
                                    title="Configurar"
                                  >
                                    <Edit size={14} />
                                  </button>
                                </PermissionGate>
                                <PermissionGate permission="rh:perfis:delete">
                                  <button
                                    onClick={() => handleDelete(role.id, role.nome)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100 shadow-sm active:scale-95"
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
    </>
  );
}
