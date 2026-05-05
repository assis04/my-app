"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Edit,
  Loader2,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PermissionGate } from "@/components/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";
import UserModal from "./components/UserModal";

import { useRouter } from "next/navigation";
import { api } from "@/services/api";

export default function GerenciarUsuarios() {
  const { user, loading } = useAuth();
  const [modalData, setModalData] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersList, setUsersList] = useState([]);
  const { can, isAdmin } = usePermissions();

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

  const handleDelete = async (id, nome) => {
    if (
      !confirm(
        `Tem certeza que deseja remover ou inativar o usuário "${nome}"?`,
      )
    )
      return;
    try {
      await api(`/users/${id}`, { method: "DELETE" });
      await fetchUsers();
    } catch (error) {
      alert(
        typeof error === "string"
          ? error
          : "Erro ao excluir usuário. Verifique se ele não possui registros associados.",
      );
    }
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

        <div className="glass-card border border-white/60 rounded-3xl p-4 md:p-6 shadow-floating mb-6">
          <h2 className="text-base font-black text-(--text-primary) flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-(--gold-soft) rounded-xl flex items-center justify-center border border-(--gold-soft) shadow-sm">
              <Users size={18} className="text-(--gold)" />
            </div>
            Colaboradores
          </h2>

          <div className="w-full overflow-hidden rounded-2xl border border-(--border-subtle)">
            {loadingUsers ? (
              <div className="flex justify-center py-16 bg-(--surface-1)/10">
                <Loader2 size={32} className="animate-spin text-(--gold)" />
              </div>
            ) : usersList.length === 0 ? (
              <div className="text-center py-20 text-(--text-muted) font-medium italic bg-(--surface-1)/10 text-xs">
                Não há colaboradores registrados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap text-(--text-secondary) border-collapse">
                  <thead className="bg-(--surface-1)/80 text-(--text-secondary) font-black text-xs border-b border-(--border-subtle) italic tracking-tight">
                    <tr>
                      <th className="py-2 px-4 italic">Colaborador</th>
                      <th className="py-2 px-4 italic">E-mail de Acesso</th>
                      <th className="py-2 px-4 italic">Perfil</th>
                      <th className="py-2 px-4 text-center italic">Filial</th>
                      <th className="py-2 px-4 italic">Status</th>
                      <th className="py-2 px-4 text-right italic">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border-subtle)">
                    {usersList.map((usr) => (
                      <tr
                        key={usr.id}
                        className="hover:bg-(--surface-1) transition-all group"
                      >
                        <td className="py-2 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-(--gold-soft) flex items-center justify-center text-(--gold) font-black text-xs border border-(--gold-soft) group-hover:bg-(--gold) group-hover:text-(--on-gold) transition-colors">
                              {usr.nome.charAt(0)}
                            </div>
                            <span className="text-(--text-primary) font-black group-hover:text-(--gold-hover) transition-colors tracking-tight">{usr.nome}</span>
                          </div>
                        </td>
                        <td className="py-2 px-4 font-bold text-(--text-secondary)">{usr.email}</td>
                        <td className="py-2 px-4">
                          <span className="text-xs font-black text-(--text-muted) bg-(--surface-2) px-2 py-0.5 rounded-lg border border-(--border-subtle) tracking-tight">
                            {usr.perfil}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-center font-bold text-(--text-muted) text-xs">{usr.filial || '—'}</td>
                        <td className="py-2 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-black border shadow-sm tracking-tight ${usr.ativo ? "bg-(--success-soft) text-(--success) border-(--success)/30" : "bg-(--danger-soft) text-(--danger) border-(--danger)/30"}`}
                          >
                            {usr.ativo ? "Ativo" : "Inativo"}
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      {modalData !== null && (
        <UserModal
          userObj={modalData?.id ? modalData : null}
          onClose={() => setModalData(null)}
          onRefresh={fetchUsers}
        />
      )}
    </>
  );
}
