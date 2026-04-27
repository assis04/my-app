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
        <header className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Gestão de Usuários
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 font-bold uppercase tracking-wider">Controle de acesso e permissões</p>
          </div>
          <PermissionGate permission="rh:usuarios:create">
            <button
              onClick={() => setModalData({})}
              className="flex items-center gap-2 bg-linear-to-r from-sky-500 to-sky-600 text-white px-5 py-2.5 rounded-full hover:shadow-sky-200/50 hover:shadow-xl font-bold shadow-lg shadow-sky-900/10 transition-all text-sm active:scale-95 whitespace-nowrap"
            >
              Criar Novo Usuário <Plus size={16} />
            </button>
          </PermissionGate>
        </header>

        <div className="glass-card border border-white/60 rounded-3xl p-4 md:p-6 shadow-floating mb-6">
          <h2 className="text-base font-black text-slate-800 flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-sky-50 rounded-xl flex items-center justify-center border border-sky-100 shadow-sm">
              <Users size={18} className="text-sky-500" />
            </div>
            Colaboradores
          </h2>

          <div className="w-full overflow-hidden rounded-2xl border border-slate-100">
            {loadingUsers ? (
              <div className="flex justify-center py-16 bg-slate-50/10">
                <Loader2 size={32} className="animate-spin text-sky-500" />
              </div>
            ) : usersList.length === 0 ? (
              <div className="text-center py-20 text-slate-400 font-medium italic bg-slate-50/10 text-xs uppercase">
                Não há colaboradores registrados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap text-slate-600 border-collapse">
                  <thead className="bg-slate-50/80 text-slate-500 font-black text-xs uppercase border-b border-slate-100 italic tracking-tighter">
                    <tr>
                      <th className="py-2 px-4 italic">Colaborador</th>
                      <th className="py-2 px-4 italic">E-mail de Acesso</th>
                      <th className="py-2 px-4 italic">Perfil</th>
                      <th className="py-2 px-4 text-center italic">Filial</th>
                      <th className="py-2 px-4 italic">Status</th>
                      <th className="py-2 px-4 text-right italic">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {usersList.map((usr) => (
                      <tr
                        key={usr.id}
                        className="hover:bg-slate-50 transition-all group"
                      >
                        <td className="py-2 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600 font-black text-xs border border-sky-100 group-hover:bg-sky-500 group-hover:text-white transition-colors uppercase">
                              {usr.nome.charAt(0)}
                            </div>
                            <span className="text-slate-900 font-black group-hover:text-sky-700 transition-colors uppercase tracking-tight">{usr.nome}</span>
                          </div>
                        </td>
                        <td className="py-2 px-4 font-bold text-slate-500">{usr.email}</td>
                        <td className="py-2 px-4">
                          <span className="text-xs font-black text-slate-400 bg-white px-2 py-0.5 rounded-lg border border-slate-100 uppercase tracking-tighter">
                            {usr.perfil}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-center font-bold text-slate-400 text-xs uppercase">{usr.filial || '—'}</td>
                        <td className="py-2 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-black border shadow-sm uppercase tracking-tighter ${usr.ativo ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"}`}
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
                                  className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all border border-transparent hover:border-sky-100 shadow-sm active:scale-95"
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
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100 shadow-sm active:scale-95"
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
