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
  }, [loading, user, router]);

  if (loading) return null;
  if (!user) return null; // Prevenção extra enquanto a AuthContext redireciona

  return (
    <div className="flex h-screen bg-[#212121] text-zinc-100 font-sans relative">
      {/* Botão Mobile */}
      <button
        className="md:hidden absolute top-4 left-4 z-50 bg-[#1c1c1c] p-2 rounded-xl border border-zinc-800 text-zinc-300"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <Menu size={24} />
      </button>

      {/* Backdrop Mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
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
      <main className="flex-1 p-6 md:p-8 overflow-y-auto min-w-0 w-full pt-16 md:pt-8 w-screen md:w-auto">
        <header className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-4">
          <h1 className="text-2xl font-light text-zinc-100">
            Gerenciar Usuários
          </h1>
          <PermissionGate permission="rh:usuarios:create">
            <button
              onClick={() => setModalData({})}
              className="flex items-center gap-2 bg-transparent border border-zinc-600 hover:border-zinc-400 text-zinc-300 px-4 py-2 rounded-full transition-colors text-sm"
            >
              Novo usuário <Plus size={16} />
            </button>
          </PermissionGate>
        </header>

        <div className="bg-[#1c1c1c] border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-lg font-medium text-zinc-300 flex items-center gap-3 mb-6">
            <Users size={20} className="text-zinc-500" /> Usuários do Sistema
          </h2>

          <div className="w-full overflow-x-auto">
            {loadingUsers ? (
              <div className="flex justify-center py-12">
                <Loader2 size={32} className="animate-spin text-[#e81cff]" />
              </div>
            ) : usersList.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                Nenhum usuário cadastrado.
              </div>
            ) : (
              <table className="w-full text-left text-sm text-zinc-400">
                <thead className="border-b border-zinc-800 text-zinc-100">
                  <tr>
                    <th className="pb-4 font-semibold">Nome</th>
                    <th className="pb-4 font-semibold">Email</th>
                    <th className="pb-4 font-semibold">Perfil</th>
                    <th className="pb-4 font-semibold">Filial</th>
                    <th className="pb-4 font-semibold">Status</th>
                    <th className="pb-4 font-semibold text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((usr) => (
                    <tr
                      key={usr.id}
                      className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors"
                    >
                      <td className="py-4 text-zinc-200">{usr.nome}</td>
                      <td className="py-4">{usr.email}</td>
                      <td className="py-4">
                        <span className="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full text-xs border border-zinc-700">
                          {usr.perfil}
                        </span>
                      </td>
                      <td className="py-4">{usr.filial}</td>
                      <td className="py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${usr.ativo ? "bg-green-600/20 text-green-500" : "bg-red-600/20 text-red-500"}`}
                        >
                          {usr.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="py-4 flex justify-center gap-2">
                        {!((usr.perfil === 'ADM' || usr.perfil === 'RH') && !isAdmin) && (
                          <PermissionGate permission="rh:usuarios:update">
                            <button
                              onClick={() => setModalData(usr)}
                              className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg"
                              title="Editar"
                            >
                              <Edit size={16} />
                            </button>
                          </PermissionGate>
                        )}
                        {!((usr.perfil === 'ADM' || usr.perfil === 'RH') && !isAdmin) && (
                          <PermissionGate permission="rh:usuarios:delete">
                            <button
                              onClick={() => handleDelete(usr.id, usr.nome)}
                              className="text-zinc-500 hover:text-red-400 transition-colors p-2 hover:bg-zinc-800 rounded-lg"
                              title="Excluir"
                            >
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
        <UserModal
          userObj={modalData?.id ? modalData : null}
          onClose={() => setModalData(null)}
          onRefresh={fetchUsers}
        />
      )}
    </div>
  );
}
