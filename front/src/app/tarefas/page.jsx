"use client";

import { useState, useEffect } from "react";
import { CheckSquare, Plus, Edit, Trash2, CheckCircle2 } from "lucide-react";
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

  const renderSkeleton = () => (
    Array.from({ length: 4 }).map((_, i) => (
      <tr key={`task-skel-${i}`} className="border-b border-(--border-subtle)/50">
        <td className="py-3 px-4"><span className="block bg-(--surface-3) animate-pulse rounded h-5 w-5" /></td>
        <td className="py-3 px-4"><span className="block bg-(--surface-3) animate-pulse rounded h-3 w-44" /></td>
        <td className="py-3 px-4"><span className="block bg-(--surface-3) animate-pulse rounded h-3 w-16" /></td>
        <td className="py-3 px-4"></td>
      </tr>
    ))
  );

  const renderTable = (taskList, emptyMessage) => (
    <div className="w-full overflow-hidden rounded-2xl border border-(--border-subtle) bg-(--surface-2)">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap text-(--text-secondary) border-collapse">
          <thead className="bg-(--surface-1)/40 text-(--text-faint) font-semibold text-[11px] uppercase tracking-wider border-b border-(--border-subtle)">
            <tr>
              <th className="py-2.5 px-4 w-10">St</th>
              <th className="py-2.5 px-4">Tarefa</th>
              <th className="py-2.5 px-4">Vencimento</th>
              <th className="py-2.5 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--border-subtle)">
            {loadingTasks ? renderSkeleton() : taskList.length === 0 ? (
              <tr><td colSpan={4} className="py-12 text-center">
                <p className="text-(--text-muted) text-sm font-medium">{emptyMessage}</p>
              </td></tr>
            ) : (
              taskList.map((task) => (
                <tr key={task.id} className="hover:bg-(--surface-1)/60 transition-colors group">
                  <td className="py-2.5 px-4 w-10">
                    <button onClick={() => toggleTaskStatus(task.id, task.status)} className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${task.status === 'CONCLUIDA' ? 'bg-(--success) border-(--success) text-white' : 'bg-(--surface-2) border-(--border) text-transparent hover:border-(--success)'}`}>
                      <CheckCircle2 size={14} />
                    </button>
                  </td>
                  <td className="py-2.5 px-4">
                    <div className={`font-semibold tracking-[-0.01em] ${task.status === 'CONCLUIDA' ? 'line-through text-(--text-muted)' : 'text-(--text-primary)'} text-sm`}>
                      {task.titulo}
                    </div>
                    {task.assignedToEquipe && (
                      <div className="text-[11px] text-(--gold) font-medium mt-0.5 inline-flex items-center gap-1.5 uppercase tracking-wider">
                        <span className="h-2 w-[2px] bg-(--gold)" aria-hidden /> {task.assignedToEquipe.nome}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-(--text-muted) text-xs tabular-nums">
                    {task.dataVencimento ? new Date(task.dataVencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—'}
                  </td>
                  <td className="py-2 px-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setModalData(task)} className="p-1.5 text-(--text-muted) hover:text-(--gold) hover:bg-(--gold-soft) rounded-lg transition-colors" title="Editar">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => handleDelete(task.id, task.titulo)} className="p-1.5 text-(--text-muted) hover:text-(--danger) hover:bg-(--danger-soft) rounded-lg transition-colors" title="Excluir">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <>
      <header className="flex flex-wrap justify-between items-center gap-3 mb-6 pb-4 border-b border-(--border-subtle)">
        <h1 className="text-2xl sm:text-3xl font-semibold text-(--text-primary) tracking-[-0.02em] flex items-baseline gap-3 min-w-0">
          Tarefas
          <span className="font-mono text-base text-(--text-faint) tabular-nums font-normal">
            {tasks.length.toString().padStart(2, '0')}
          </span>
        </h1>
        <button
          onClick={() => setModalData({})}
          className="flex items-center gap-2 bg-(--gold) text-(--on-gold) px-4 h-9 rounded-lg font-semibold transition-transform text-sm active:scale-[0.98] whitespace-nowrap tracking-tight"
          style={{ boxShadow: 'var(--shadow-warm)', transitionTimingFunction: 'var(--ease-spring)' }}
        >
          <Plus size={14} /> Nova tarefa
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Minhas Tarefas */}
        <section>
          <h2 className="text-sm font-semibold text-(--text-secondary) mb-3 flex items-center gap-2 tracking-tight">
            <CheckSquare size={14} className="text-(--gold)" />
            Minhas tarefas
            <span className="text-(--text-faint) font-normal tabular-nums">· {filteredMinhas.length}</span>
          </h2>
          {renderTable(filteredMinhas, "Você não tem atividades pendentes.")}
        </section>

        {/* Tarefas da Equipe */}
        <section>
          <h2 className="text-sm font-semibold text-(--text-secondary) mb-3 flex items-center gap-2 tracking-tight">
            <CheckSquare size={14} className="text-(--gold)" />
            Tarefas da equipe
            <span className="text-(--text-faint) font-normal tabular-nums">· {filteredEquipe.length}</span>
          </h2>
          {renderTable(filteredEquipe, "Sua equipe não possui tarefas em aberto.")}
        </section>
      </div>

      {modalData && (
        <TaskModal task={modalData} onClose={() => { setModalData(null); fetchTasks(); }} user={user} isAdmin={isAdmin} />
      )}
      <ConfirmDialog {...confirmProps} />
    </>
  );
}
