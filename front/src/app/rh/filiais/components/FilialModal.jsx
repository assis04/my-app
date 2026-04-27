import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { Loader2, Building2, AlertTriangle, UserCheck } from 'lucide-react';
import PremiumSelect from '@/components/ui/PremiumSelect';

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
        const raw = await api('/users');
        const data = raw?.data ?? (Array.isArray(raw) ? raw : []);
        const filtered = data
          .filter(u => ['Gerente', 'GERENTE', 'ADM', 'Administrador'].includes(u.perfil))
          .map(u => ({ id: u.id, nome: `${u.nome} (${u.perfil})` }));
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/10 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative transition-all">

        {/* Header */}
        <div className="flex justify-between items-center p-8 border-b border-slate-100 bg-white">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-4 text-slate-900">
            <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center border border-sky-100 shadow-sm">
              <Building2 size={24} className="text-sky-600" />
            </div>
            {isEditing ? 'Ajustar Filial' : 'Nova Filial'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 transition-all bg-slate-50 hover:bg-slate-100 p-2.5 rounded-full cursor-pointer border border-slate-100 flex items-center justify-center active:scale-90">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-white relative z-10">
          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl text-base font-bold flex items-start gap-3 shadow-sm">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-2 focus-within:scale-[1.01] transition-transform">
            <label className="text-sm font-bold text-slate-400 ml-1">Nome da Filial *</label>
            <input
              required
              type="text"
              placeholder="Ex: Matriz São Paulo"
              className="w-full bg-slate-50 text-slate-900 p-3 rounded-2xl border border-slate-200 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all font-black placeholder:text-slate-300 text-base shadow-xs"
              value={formData.nome}
              onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))}
            />
          </div>

          <div className="space-y-2 focus-within:scale-[1.01] transition-transform">
            <label className="text-sm font-bold text-slate-400 ml-1">Localização (Endereço)</label>
            <input
              type="text"
              placeholder="Rua, número, cidade - estado"
              className="w-full bg-slate-50 text-slate-900 p-3 rounded-2xl border border-slate-200 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all font-bold placeholder:text-slate-300 text-base shadow-xs"
              value={formData.endereco}
              onChange={e => setFormData(p => ({ ...p, endereco: e.target.value }))}
            />
          </div>

          <div className="space-y-2 focus-within:scale-[1.01] transition-transform">
            <label className="text-sm font-bold text-slate-400 ml-1 flex items-center gap-2">
              <UserCheck size={14} /> Gerente
            </label>
            <PremiumSelect 
              placeholder="Selecione um gestor..."
              options={users}
              value={formData.managerId}
              onChange={(e) => setFormData(p => ({ ...p, managerId: e.target.value }))}
            />
          </div>

          <div className="flex gap-4 pt-4 border-t border-slate-50">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 font-bold text-sm border border-slate-200 text-slate-400 rounded-2xl hover:bg-slate-50 hover:text-slate-600 transition-all active:scale-95 shadow-sm">
              Retornar
            </button>
            <button type="submit" disabled={loading}
              className="flex-2 bg-linear-to-br from-sky-400 to-sky-600 text-white py-2.5 rounded-2xl hover:shadow-sky-200/50 hover:shadow-xl transition-all font-bold text-base shadow-lg shadow-sky-900/10 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-3 active:scale-95 whitespace-nowrap">
              {loading ? <><Loader2 size={18} className="animate-spin" /> Processando...</> : (
                <>{isEditing ? 'Confirmar Ajuste' : 'Efetivar Unidade'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
