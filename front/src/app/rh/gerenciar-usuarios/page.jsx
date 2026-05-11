"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PermissionGate } from "@/components/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";
import UserModal from "./components/UserModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useConfirm } from "@/hooks/useConfirm";

import { useRouter } from "next/navigation";
import { api } from "@/services/api";

export default function GerenciarUsuarios() {
  const { user, loading } = useAuth();
  const [modalData, setModalData] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersList, setUsersList] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const { can, isAdmin } = usePermissions();
  const { confirm, confirmProps } = useConfirm();

  const router = useRouter();

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const raw = await api("/users");
      setUsersList(raw?.data ?? (Array.isArray(raw) ? raw : []));
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleDelete = (id, nome) => {
    confirm({
      title: 'Remover Usuário',
      message: `Tem certeza que deseja remover ou inativar o usuário "${nome}"?`,
      confirmLabel: 'Remover',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api(`/users/${id}`, { method: "DELETE" });
          await fetchUsers();
        } catch (error) {
          setErrorMsg(typeof error === "string" ? error : "Erro ao excluir usuário. Verifique se ele não possui registros associados.");
        }
      },
    });
  };

  useEffect(() => {
    if (!loading && user) {
      if (!can("rh:usuarios:read")) {
        router.push("/");
      } else {
        fetchUsers();
      }
    }
  }, [loading, user, router, can]);

  if (loading) return null;
  if (!user) return null; // Prevenção extra enquanto a AuthContext redireciona

  return (
    <>
        <header className="flex justify-between items-center mb-6 pb-4 border-b border-(--border)">
          <div>
            <h1 className="text-2xl font-black text-(--text-primary) tracking-tight">
              Gestão de Usuários
            </h1>
            <p className="text-xs text-(--text-secondary) mt-0.5 font-bold tracking-wider">Controle de acesso e permissões</p>
          </div>
          <PermissionGate permission="rh:usuarios:create">
            <button
              onClick={() => setModalData({})}
              className="flex items-center gap-2 bg-(--gold) text-(--on-gold) px-5 py-2.5 rounded-full  hover:shadow-xl font-bold shadow-lg transition-all text-sm active:scale-95 whitespace-nowrap"
            >
              Criar Novo Usuário <Plus size={16} />
            </button>
          </PermissionGate>
        </header>

        <div className="glass-card border border-(--border-subtle) rounded-3xl p-4 md:p-6 shadow-floating mb-6">
          <h2 className="text-base font-black text-(--text-primary) flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-(--gold-soft) rounded-xl flex items-center justify-center border border-(--gold-soft) shadow-sm">
              <Users size={18} className="text-(--gold)" />
            </div>
            Colaboradores
          </h2>

          <div className="w-full overflow-hidden rounded-2xl border border-(--border-subtle)">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap text-(--text-secondary) border-collapse">
                <thead className="bg-(--surface-1)/40 text-(--text-faint) font-semibold text-[11px] uppercase tracking-wider border-b border-(--border-subtle)">
                  <tr>
                    <th className="py-2.5 px-4">Colaborador</th>
                    <th className="py-2.5 px-4">E-mail de Acesso</th>
                    <th className="py-2.5 px-4">Perfil</th>
                    <th className="py-2.5 px-4 text-center">Filial</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border-subtle)">
                  {loadingUsers ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={`usr-skel-${i}`} className="border-b border-(--border-subtle)/50">
                        <td className="py-3 px-4"><span className="block bg-(--surface-3) animate-pulse rounded h-3 w-32" /></td>
                        <td className="py-3 px-4"><span className="block bg-(--surface-3) animate-pulse rounded h-3 w-40" /></td>
                        <td className="py-3 px-4"><span className="block bg-(--surface-3) animate-pulse rounded h-3 w-16" /></td>
                        <td className="py-3 px-4"><span className="block bg-(--surface-3) animate-pulse rounded h-3 w-20 mx-auto" /></td>
                        <td className="py-3 px-4"><span className="block bg-(--surface-3) animate-pulse rounded-full h-4 w-14" /></td>
                        <td className="py-3 px-4"></td>
                      </tr>
                    ))
                  ) : usersList.length === 0 ? (
                    <tr><td colSpan={6} className="py-14 text-center">
                      <div className="w-10 h-10 bg-(--surface-1) rounded-2xl flex items-center justify-center mx-auto mb-3 border border-(--border-subtle) text-(--text-faint)">
                        <Users size={18} />
                      </div>
                      <p className="text-(--text-muted) text-sm font-medium">Não há colaboradores registrados.</p>
                    </td></tr>
                  ) : (
                    usersList.map((usr) => (
                      <tr
                        key={usr.id}
                        className="hover:bg-(--surface-1)/60 transition-colors group"
                      >
                        <td className="py-2 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-(--gold-soft) flex items-center justify-center text-(--gold) font-semibold text-xs border border-(--gold-soft) group-hover:bg-(--gold) group-hover:text-(--on-gold) transition-colors">
                              {usr.nome.charAt(0)}
                            </div>
                            <span className="text-(--text-primary) font-semibold group-hover:text-(--gold-hover) transition-colors tracking-tight">{usr.nome}</span>
                          </div>
                        </td>
                        <td className="py-2 px-4 font-medium text-(--text-secondary)">{usr.email}</td>
                        <td className="py-2 px-4">
                          <span className="text-xs font-medium text-(--text-muted) bg-(--surface-2) px-2 py-0.5 rounded-lg border border-(--border-subtle) tracking-tight">
                            {usr.perfil}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-center text-(--text-muted) text-sm">{usr.filial || '—'}</td>
                        <td className="py-2 px-4">
                          <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                            <span className={`w-1.5 h-1.5 rounded-full ${usr.ativo ? 'bg-(--success)' : 'bg-(--danger)'}`} aria-hidden />
                            <span className={usr.ativo ? 'text-(--success)' : 'text-(--danger)'}>{usr.ativo ? "Ativo" : "Inativo"}</span>
                          </span>
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex justify-end gap-1">
                            {!((usr.perfil === 'ADM' || usr.perfil === 'RH') && !isAdmin) && (
                              <PermissionGate permission="rh:usuarios:update">
                                <button
                                  onClick={() => setModalData(usr)}
                                  className="p-1.5 text-(--text-muted) hover:text-(--gold) hover:bg-(--gold-soft) rounded-xl transition-all border border-transparent hover:border-(--gold-soft) shadow-sm active:scale-95"
                                  title="Editar"
                                >
                                  <Edit size={14} />
                                </button>
                              </PermissionGate>
                            )}
                            {!((usr.perfil === 'ADM' || usr.perfil === 'RH') && !isAdmin) && (
                              <PermissionGate permission="rh:usuarios:delete">
                                <button
                                  onClick={() => handleDelete(usr.id, usr.nome)}
                                  className="p-1.5 text-(--text-muted) hover:text-(--danger) hover:bg-(--danger-soft) rounded-xl transition-all border border-transparent hover:border-(--danger)/30 shadow-sm active:scale-95"
                                  title="Excluir"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </PermissionGate>
                            )}
                          </div>
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
        <UserModal
          userObj={modalData?.id ? modalData : null}
          onClose={() => setModalData(null)}
          onRefresh={fetchUsers}
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
