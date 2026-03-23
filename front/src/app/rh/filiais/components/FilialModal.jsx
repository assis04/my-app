import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { Loader2, Building2, AlertTriangle, UserCheck, ChevronDown } from 'lucide-react';

export default function FilialModal({ filial = null, onClose, onRefresh }) {
  const isEditing = !!filial;
  const [formData, setFormData] = useState({
    nome: filial?.nome || '',
    endereco: filial?.endereco || '',
    managerId: filial?.managerId || '',
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchUsers() {
      try {
        const data = await api('/users');
        // Filtrar apenas gerentes/admins
        const filtered = data.filter(u => 
          ['Gerente', 'GERENTE', 'ADM', 'Administrador'].includes(u.perfil)
        );
        setUsers(filtered);
      } catch (err) {
        console.error('Erro ao carregar usuários:', err);
      }
    }
    fetchUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.nome.trim()) { setError('O nome da filial é obrigatório.'); return; }
    setLoading(true);
    try {
      if (isEditing) {
        await api(`/filiais/${filial.id}`, { method: 'PUT', body: formData });
      } else {
        await api('/filiais', { body: formData });
      }
      onRefresh();
      onClose();
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Erro inesperado. O nome já existe?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1a1a1a] border border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl">

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold flex items-center gap-3 text-zinc-100">
            <div className="w-9 h-9 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700">
              <Building2 size={18} className="text-amber-400" />
            </div>
            {isEditing ? 'Editar Filial' : 'Nova Filial'}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white hover:bg-zinc-800 p-1.5 rounded-full cursor-pointer text-xl leading-none transition-colors">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3.5 rounded-xl text-sm flex items-start gap-2.5">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-400">Nome da Filial *</label>
            <input
              required
              type="text"
              placeholder="Ex: Matriz São Paulo"
              className="w-full bg-[#242424] text-white p-3 rounded-xl border border-zinc-700 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-all placeholder:text-zinc-600 text-sm"
              value={formData.nome}
              onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-400">Endereço</label>
            <input
              type="text"
              placeholder="Rua, número, cidade - estado"
              className="w-full bg-[#242424] text-white p-3 rounded-xl border border-zinc-700 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-all placeholder:text-zinc-600 text-sm"
              value={formData.endereco}
              onChange={e => setFormData(p => ({ ...p, endereco: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <UserCheck size={14} /> Gerente Responsável
            </label>
            <div className="relative">
              <select
                value={formData.managerId}
                onChange={(e) => setFormData(p => ({ ...p, managerId: e.target.value }))}
                className="appearance-none w-full bg-[#242424] text-white p-3 pr-10 rounded-xl border border-zinc-700 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-all text-sm cursor-pointer"
              >
                <option value="">Selecione um gerente...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.nome} ({u.perfil})</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 font-medium border border-zinc-700 text-zinc-400 rounded-xl hover:bg-zinc-800 hover:text-zinc-200 transition-colors text-sm">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-black py-3 rounded-xl transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 text-sm">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : isEditing ? 'Salvar Alterações' : 'Criar Filial'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
