"use client";

import { useState, useEffect } from "react";
import {
  BarChart2,
  Brain,
  Target,
  CheckSquare,
  Flag,
  Users,
  Bell,
  User,
  Settings,
  LogOut,
  Plus,
  Edit,
  Loader2,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PermissionGate } from "@/components/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";
import UserModal from "./components/UserModal";

import { Sidebar } from "@/components/ui/Sidebar";
import { Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";

export default function GerenciarUsuarios() {
  const { user, loading } = useAuth();
  const [modalData, setModalData] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersList, setUsersList] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { can, isAdmin } = usePermissions();

  const router = useRouter();

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const data = await api("/users");
      setUsersList(data);
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
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans relative page-transition">
      {/* Botão Mobile */}
      <button
        className="md:hidden absolute top-4 left-4 z-50 bg-white p-2 rounded-xl border border-slate-200 text-slate-600 shadow-sm transition-all hover:bg-slate-50"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <Menu size={24} />
      </button>

      {/* Backdrop Mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/10 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Envolto com lógica mobile */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transform ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out`}
      >
        <Sidebar />
      </div>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto min-w-0 w-full pt-16 md:pt-8 bg-slate-50">
        <header className="flex justify-between items-center mb-10 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Gestão de Usuários
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">Controle de acesso e permissões da plataforma</p>
          </div>
          <PermissionGate permission="rh:usuarios:create">
            <button
              onClick={() => setModalData({})}
              className="flex items-center gap-2 bg-linear-to-r from-sky-500 to-sky-600 text-white px-6 py-3 rounded-full hover:shadow-sky-200/50 hover:shadow-xl font-bold shadow-lg shadow-sky-900/10 transition-all text-sm active:scale-95"
            >
              Criar Novo Usuário <Plus size={18} />
            </button>
          </PermissionGate>
        </header>

        <div className="glass-card border border-white/60 rounded-3xl p-10 shadow-floating mb-12">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-4 mb-10">
            <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center border border-sky-100 shadow-sm">
              <Users size={22} className="text-sky-500" />
            </div>
            Colaboradores
          </h2>

          <div className="w-full overflow-hidden rounded-2xl border border-slate-100">
            {loadingUsers ? (
              <div className="flex justify-center py-20 bg-slate-50/10">
                <Loader2 size={40} className="animate-spin text-sky-500" />
              </div>
            ) : usersList.length === 0 ? (
              <div className="text-center py-24 text-slate-400 font-medium italic bg-slate-50/10 text-sm">
                Não há colaboradores registrados para exibição.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap text-slate-600 border-collapse">
                  <thead className="bg-slate-50/80 text-slate-500 font-bold text-xs border-b border-slate-100">
                    <tr>
                      <th className="py-4 px-6">Colaborador</th>
                      <th className="py-4 px-6">E-mail de Acesso</th>
                      <th className="py-4 px-6">Perfil</th>
                      <th className="py-4 px-6 text-center">Filial</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-right">Ações Rápidas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {usersList.map((usr) => (
                      <tr
                        key={usr.id}
                        className="hover:bg-slate-50 transition-all group"
                      >
                        <td className="py-5 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600 font-black text-xs border border-sky-100 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                              {usr.nome.charAt(0)}
                            </div>
                            <span className="text-slate-900 font-bold group-hover:text-sky-700 transition-colors">{usr.nome}</span>
                          </div>
                        </td>
                        <td className="py-5 px-6 font-medium">{usr.email}</td>
                        <td className="py-5 px-6">
                          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                            {usr.perfil}
                          </span>
                        </td>
                        <td className="py-5 px-6 text-center font-medium text-slate-400 text-xs">{usr.filial || '—'}</td>
                        <td className="py-5 px-6">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-semibold border shadow-sm ${usr.ativo ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"}`}
                          >
                            {usr.ativo ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="py-5 px-6">
                          <div className="flex justify-end gap-2">
                            {!((usr.perfil === 'ADM' || usr.perfil === 'RH') && !isAdmin) && (
                              <PermissionGate permission="rh:usuarios:update">
                                <button
                                  onClick={() => setModalData(usr)}
                                  className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all border border-transparent hover:border-sky-100 shadow-sm active:scale-95"
                                  title="Editar Usuário"
                                >
                                  <Edit size={16} />
                                </button>
                              </PermissionGate>
                            )}
                            {!((usr.perfil === 'ADM' || usr.perfil === 'RH') && !isAdmin) && (
                              <PermissionGate permission="rh:usuarios:delete">
                                <button
                                  onClick={() => handleDelete(usr.id, usr.nome)}
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100 shadow-sm active:scale-95"
                                  title="Excluir Usuário"
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
        <UserModal
          userObj={modalData?.id ? modalData : null}
          onClose={() => setModalData(null)}
          onRefresh={fetchUsers}
        />
      )}
    </div>
  );
}
