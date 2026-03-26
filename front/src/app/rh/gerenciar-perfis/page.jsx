'use client';

import { useState, useEffect } from 'react';
import { Shield, Plus, Edit, Menu, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/ui/Sidebar';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import RoleModal from './components/RoleModal';
import { PermissionGate } from '@/components/PermissionGate';
import { usePermissions } from '@/hooks/usePermissions';

export default function GerenciarPerfis() {
  const { user, loading: authLoading } = useAuth();
  const [modalData, setModalData] = useState(null); // null = fechado, {} = novo, { id, ... } = editar
  const [rolesList, setRolesList] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans relative page-transition">
      <button 
        className="md:hidden absolute top-4 left-4 z-50 bg-white p-2 rounded-xl border border-slate-200 text-slate-600 shadow-sm transition-all hover:bg-slate-50"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <Menu size={24} />
      </button>

      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/10 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className={`fixed inset-y-0 left-0 z-40 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out`}>
         <Sidebar />
      </div>

      <main className="flex-1 p-6 md:p-8 overflow-y-auto min-w-0 w-full pt-16 md:pt-8 bg-slate-50">
        <header className="flex justify-between items-center mb-10 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestão de Perfis</h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">Definição de papéis e níveis de acesso</p>
          </div>
          <PermissionGate permission="rh:perfis:create">
            <button 
              onClick={() => setModalData({})}
              className="flex items-center gap-2 bg-linear-to-r from-sky-500 to-sky-600 text-white px-6 py-3 rounded-full hover:shadow-sky-200/50 hover:shadow-xl font-bold shadow-lg shadow-sky-900/10 transition-all text-sm active:scale-95"
            >
              Criar Novo Perfil <Plus size={18} />
            </button>
          </PermissionGate>
        </header>

        <div className="glass-card border border-white/60 rounded-3xl p-10 shadow-floating mb-12">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-4 mb-10">
            <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center border border-sky-100 shadow-sm">
              <Shield size={22} className="text-sky-500" />
            </div>
            Perfis
          </h2>

          <div className="w-full overflow-hidden rounded-2xl border border-slate-100">
            {loadingRoles ? (
              <div className="flex justify-center py-20 bg-slate-50/10">
                 <Loader2 size={40} className="animate-spin text-sky-500" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap text-slate-600 border-collapse">
                  <thead className="bg-slate-50/80 text-slate-500 font-bold text-xs border-b border-slate-100">
                    <tr>
                      <th className="py-4 px-6 w-20">REF</th>
                      <th className="py-4 px-6">Identificador</th>
                      <th className="py-4 px-6">Descrição das Atribuições</th>
                      <th className="py-4 px-6 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {rolesList.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-20 text-slate-400 font-medium italic bg-slate-50/10">Nenhum perfil configurado até o momento.</td>
                      </tr>
                    ) : rolesList.map((role) => (
                      <tr key={role.id} className="hover:bg-slate-50 transition-all group">
                        <td className="py-5 px-6 font-bold text-slate-400 text-xs">#{role.id}</td>
                        <td className="py-5 px-6">
                          <span className="text-xs font-semibold text-sky-600 bg-sky-50/50 px-4 py-1.5 rounded-lg border border-sky-100 shadow-xs group-hover:bg-sky-500 group-hover:text-white transition-all">
                            {role.nome.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-5 px-6 font-medium text-slate-500 italic max-w-xs truncate">
                          {role.descricao || 'Este perfil não possui uma descrição formal.'}
                        </td>
                        <td className="py-5 px-6">
                          <div className="flex justify-end gap-2 text-center">
                            {!((role.nome === 'ADM' || role.nome === 'RH') && !isAdmin) && (
                              <PermissionGate permission="rh:perfis:update">
                                <button
                                  onClick={() => setModalData(role)}
                                  className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all border border-transparent hover:border-sky-100 shadow-sm active:scale-95"
                                  title="Configurar Perfil"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => handleDelete(role.id, role.nome)}
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100 shadow-sm active:scale-95"
                                  title="Deletar Perfil"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </PermissionGate>
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
      </main>

      {modalData !== null && (
        <RoleModal
          role={modalData?.id ? modalData : null}
          onClose={() => setModalData(null)} 
          onRefresh={fetchRoles} 
        />
      )}
    </div>
  );
}
