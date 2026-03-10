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
  }, [authLoading, user, router]);

  if (authLoading || !user) return null;

  return (
    <div className="flex h-screen bg-[#212121] text-zinc-100 font-sans relative">
      <button 
        className="md:hidden absolute top-4 left-4 z-50 bg-[#1c1c1c] p-2 rounded-xl border border-zinc-800 text-zinc-300"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <Menu size={24} />
      </button>

      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className={`fixed inset-y-0 left-0 z-40 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out`}>
         <Sidebar />
      </div>

      <main className="flex-1 p-6 md:p-8 overflow-y-auto min-w-0 w-full pt-16 md:pt-8 w-screen md:w-auto">
        <header className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-4">
          <h1 className="text-2xl font-light text-zinc-100">Gerenciar Perfis</h1>
          <PermissionGate permission="rh:perfis:create">
            <button 
              onClick={() => setModalData({})}
              className="flex items-center gap-2 bg-transparent border border-zinc-600 hover:border-zinc-400 text-zinc-300 px-4 py-2 rounded-full transition-colors text-sm"
            >
              Novo Perfil <Plus size={16} />
            </button>
          </PermissionGate>
        </header>

        <div className="bg-[#1c1c1c] border border-zinc-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-medium text-zinc-300 flex items-center gap-3 mb-6">
            <Shield size={20} className="text-[#e81cff]" /> Perfis de Acesso
          </h2>

          <div className="w-full overflow-x-auto">
            {loadingRoles ? (
              <div className="flex justify-center py-12">
                 <Loader2 size={32} className="animate-spin text-zinc-500" />
              </div>
            ) : (
              <table className="w-full text-left text-sm text-zinc-400">
                <thead className="border-b border-zinc-800 text-zinc-100">
                  <tr>
                    <th className="pb-4 font-semibold">ID</th>
                    <th className="pb-4 font-semibold">Nome do Perfil</th>
                    <th className="pb-4 font-semibold">Descrição</th>
                    <th className="pb-4 font-semibold text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rolesList.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-8 text-zinc-500">Nenhum perfil encontrado.</td>
                    </tr>
                  ) : rolesList.map((role) => (
                    <tr key={role.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                      <td className="py-4 text-zinc-500">#{role.id}</td>
                      <td className="py-4 font-medium text-zinc-200">
                        <span className="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full text-xs border border-zinc-700">
                          {role.nome.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 truncate max-w-xs">{role.descricao || 'Sem descrição'}</td>
                      <td className="py-4 flex justify-center gap-2">
                        {!((role.nome === 'ADM' || role.nome === 'RH') && !isAdmin) && (
                          <PermissionGate permission="rh:perfis:update">
                            <button onClick={() => setModalData(role)} className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg" title="Editar">
                              <Edit size={16} />
                            </button>
                            <button onClick={() => handleDelete(role.id, role.nome)} className="text-zinc-500 hover:text-red-400 transition-colors p-2 hover:bg-zinc-800 rounded-lg" title="Excluir">
                              <Trash2 size={16} />
                            </button>
                          </PermissionGate>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
