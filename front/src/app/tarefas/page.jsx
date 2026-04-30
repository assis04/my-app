"use client";

import { useState, useEffect } from "react";
import { CheckSquare, Plus, Loader2, Edit, Trash2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import TaskModal from "./components/TaskModal";
import { PermissionGate } from "@/components/PermissionGate";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useConfirm } from "@/hooks/useConfirm";

export default function Tarefas() {
  const { user, loading } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [modalData, setModalData] = useState(null);
  const { confirm, confirmProps } = useConfirm();

  const fetchTasks = async () => {
    try {
      setLoadingTasks(true);
      const result = await api("/api/tasks");
      setTasks(result?.data ?? (Array.isArray(result) ? result : []));
    } catch (error) {
      console.error("Erro ao buscar tarefas:", error);
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    if (!loading && user) {
      fetchTasks();
    }
  }, [loading, user]);

  const toggleTaskStatus = async (taskId, currentStatus) => {
    const newStatus = currentStatus === "CONCLUIDA" ? "PENDENTE" : "CONCLUIDA";
    try {
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      await api(`/api/tasks/${taskId}/status`, {
        method: "PUT",
        body: { status: newStatus }
      });
    } catch {
      fetchTasks();
    }
  };

  const handleDelete = (id, titulo) => {
    confirm({
      title: 'Excluir Tarefa',
      message: `Tem certeza que deseja excluir a tarefa "${titulo}"?`,
      confirmLabel: 'Excluir',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api(`/api/tasks/${id}`, { method: "DELETE" });
          setTasks(prev => prev.filter(t => t.id !== id));
        } catch {
          fetchTasks();
        }
      },
    });
  };

  if (loading || !user) return null;

  const isAdmin = user?.role?.nome === 'ADM' || user?.role?.nome === 'Administrador';
  const filteredMinhas = tasks.filter(task => task.assignedToUserId === user.id || task.createdById === user.id);
  const filteredEquipe = tasks.filter(task =>
    task.assignedToEquipeId !== null && task.assignedToEquipeId === user.equipeId
  );

  const renderTable = (taskList, emptyMessage) => (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-100 bg-white">
      {loadingTasks ? (
        <div className="flex justify-center py-12 bg-slate-50/10">
          <Loader2 size={24} className="animate-spin text-sky-500" />
        </div>
      ) : taskList.length === 0 ? (
        <div className="text-center py-16 text-slate-400 font-medium italic bg-slate-50/10 text-xs">
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap text-slate-600 border-collapse">
            <thead className="bg-slate-50/80 text-slate-500 font-black text-xs border-b border-slate-100 italic tracking-tight">
              <tr>
                <th className="py-2 px-4 italic w-10">St.</th>
                <th className="py-2 px-4 italic">Tarefa</th>
                <th className="py-2 px-4 italic">Vencimento</th>
                <th className="py-2 px-4 text-right italic">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {taskList.map((task) => (
                <tr key={task.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="py-1.5 px-4 w-10">
                     <button onClick={() => toggleTaskStatus(task.id, task.status)} className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${task.status === 'CONCLUIDA' ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-white border-slate-300 text-transparent hover:border-emerald-400'}`}>
                        <CheckCircle2 size={14} />
                     </button>
                  </td>
                  <td className="py-1.5 px-4">
                    <div className={`font-bold ${task.status === 'CONCLUIDA' ? 'line-through text-slate-400' : 'text-slate-800'} ${isAdmin ? 'text-sm' : 'text-sm'}`}>
                      {task.titulo}
                    </div>
                    {task.assignedToEquipe && (
                       <div className="text-xs text-purple-600 font-bold bg-purple-50 inline-block px-1.5 rounded mt-0.5">Equipe: {task.assignedToEquipe.nome}</div>
                    )}
                  </td>
                  <td className="py-1.5 px-4 font-bold text-xs text-slate-500">
                    {task.dataVencimento ? new Date(task.dataVencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}
                  </td>
                  <td className="py-1.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setModalData(task)} className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => handleDelete(task.id, task.titulo)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <>
        <header className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Lista de Tarefas</h1>
            <p className="text-xs text-slate-500 mt-0.5 font-bold tracking-wider">Gestão Pessoal e de Equipes</p>
          </div>
          <button
            onClick={() => setModalData({})}
            className="flex items-center gap-2 bg-linear-to-r from-sky-500 to-sky-600 text-white px-5 py-2.5 rounded-full hover:shadow-sky-200/50 hover:shadow-xl font-bold shadow-lg shadow-sky-900/10 transition-all text-sm active:scale-95 whitespace-nowrap"
          >
            Nova Tarefa <Plus size={16} />
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 items-start">
           {/* Coluna Esquerda: Minhas Tarefas */}
           <div className="glass-card border border-white/60 rounded-3xl p-4 md:p-5 shadow-floating">
              <h2 className="text-base font-black text-slate-800 mb-4 flex items-center gap-2">
                 <div className="w-6 h-6 bg-sky-100 rounded-lg flex items-center justify-center text-sky-600"><CheckSquare size={14}/></div>
                 MINHAS TAREFAS
              </h2>
              {renderTable(filteredMinhas, "Você não tem atividades pendentes.")}
           </div>

           {/* Coluna Direita: Tarefas da Equipe */}
           <div className="glass-card border border-white/60 rounded-3xl p-4 md:p-5 shadow-floating">
              <h2 className="text-base font-black text-slate-800 mb-4 flex items-center gap-2">
                 <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600"><CheckSquare size={14}/></div>
                 TAREFAS DA EQUIPE
              </h2>
              {renderTable(filteredEquipe, "Sua equipe não possui tarefas em aberto.")}
           </div>
        </div>

      {modalData && (
        <TaskModal task={modalData} onClose={() => { setModalData(null); fetchTasks(); }} user={user} isAdmin={isAdmin} />
      )}
      <ConfirmDialog {...confirmProps} />
    </>
  );
}
