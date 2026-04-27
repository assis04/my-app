import { useState, useEffect } from "react";
import { X, Loader2, Save } from "lucide-react";
import { api } from "@/services/api";

export default function TaskModal({ task, onClose, user, isAdmin }) {
  const isEditing = !!task?.id;
  const [loading, setLoading] = useState(false);
  const [equipes, setEquipes] = useState([]);
  
  const [formData, setFormData] = useState({
    titulo: task?.titulo || "",
    descricao: task?.descricao || "",
    dataVencimento: task?.dataVencimento ? new Date(task.dataVencimento).toISOString().split('T')[0] : "",
    assignedToEquipeId: task?.assignedToEquipeId?.toString() || "",
  });

  const isGerente = user?.equipeLiderada && user.equipeLiderada.length > 0;
  const canAssignToEquipe = isAdmin || isGerente;

  useEffect(() => {
    if (canAssignToEquipe) {
      api("/equipes").then(setEquipes).catch(console.error);
    }
  }, [canAssignToEquipe]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const payload = { ...formData };
      if (!payload.assignedToEquipeId) {
          delete payload.assignedToEquipeId;
          // Se não atribuiu à equipe, e é criação, atribui a si mesmo (ou deixa o backend fazer)
          if (!isEditing) {
             payload.assignedToUserId = user.id;
          }
      } else {
          payload.assignedToEquipeId = Number(payload.assignedToEquipeId);
      }

      const method = isEditing ? "PUT" : "POST";
      const endpoint = isEditing ? `/api/tasks/${task.id}` : "/api/tasks";

      await api(endpoint, { method, body: payload });
      onClose(); // Atualiza a lista
    } catch (error) {
      alert(typeof error === "string" ? error : "Erro ao salvar tarefa.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-base font-black text-slate-800 tracking-tight">
              {isEditing ? "Editar Tarefa" : "Nova Tarefa"}
            </h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">
              {isEditing ? "Atualize os dados" : "Crie um novo registro"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form id="taskForm" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Título da Tarefa</label>
              <input
                type="text"
                required
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-bold text-sm"
                placeholder="Ex: Ligar para Cliente VIP"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Descrição (Opcional)</label>
              <textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-medium text-sm resize-none"
                placeholder="Detalhes adicionais..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Vencimento</label>
                  <input
                    type="date"
                    value={formData.dataVencimento}
                    onChange={(e) => setFormData({ ...formData, dataVencimento: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-bold text-sm"
                  />
               </div>

               {canAssignToEquipe && (
                 <div>
                    <label className="block text-xs font-black text-sky-600 uppercase tracking-wider mb-1.5 ml-1">Atribuir a Equipe?</label>
                    <select
                      value={formData.assignedToEquipeId}
                      onChange={(e) => setFormData({ ...formData, assignedToEquipeId: e.target.value })}
                      className="w-full bg-sky-50 border border-sky-100 text-sky-900 px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all font-bold text-sm appearance-none cursor-pointer"
                    >
                      <option value="">Apenas para mim</option>
                      {equipes.map((eq) => (
                        <option key={eq.id} value={eq.id}>Equipe: {eq.nome}</option>
                      ))}
                    </select>
                 </div>
               )}
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl transition-colors">
            Cancelar
          </button>
          <button
            type="submit"
            form="taskForm"
            disabled={loading}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl hover:bg-slate-800 transition-colors font-bold text-sm disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isEditing ? "Salvar Alterações" : "Criar Tarefa"}
          </button>
        </div>
      </div>
    </div>
  );
}
