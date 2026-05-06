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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-(--surface-4)/10 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-(--surface-2) border border-(--border) w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative transition-all">

        {/* Header */}
        <div className="flex justify-between items-center p-8 border-b border-(--border-subtle) bg-(--surface-2)">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-4 text-(--text-primary)">
            <div className="w-12 h-12 bg-(--gold-soft) rounded-2xl flex items-center justify-center border border-(--gold-soft) shadow-sm">
              <Building2 size={24} className="text-(--gold)" />
            </div>
            {isEditing ? 'Ajustar Filial' : 'Nova Filial'}
          </h2>
          <button onClick={onClose} className="text-(--text-muted) hover:text-(--text-primary) transition-all bg-(--surface-1) hover:bg-(--surface-3) p-2.5 rounded-full cursor-pointer border border-(--border-subtle) flex items-center justify-center active:scale-90">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-(--surface-2) relative z-10">
          {error && (
            <div className="bg-(--danger-soft) border border-(--danger)/30 text-(--danger) p-4 rounded-2xl text-base font-bold flex items-start gap-3 shadow-sm">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-2 focus-within:scale-[1.01] transition-transform">
            <label className="text-sm font-bold text-(--text-muted) ml-1">Nome da Filial *</label>
            <input
              required
              type="text"
              placeholder="Ex: Matriz São Paulo"
              className="w-full bg-(--surface-1) text-(--text-primary) p-3 rounded-2xl border border-(--border) outline-none focus:border-(--gold) focus:ring-4 focus:ring-(--gold)/10 transition-all font-black placeholder:text-(--text-muted) text-base shadow-xs"
              value={formData.nome}
              onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))}
            />
          </div>

          <div className="space-y-2 focus-within:scale-[1.01] transition-transform">
            <label className="text-sm font-bold text-(--text-muted) ml-1">Localização (Endereço)</label>
            <input
              type="text"
              placeholder="Rua, número, cidade - estado"
              className="w-full bg-(--surface-1) text-(--text-primary) p-3 rounded-2xl border border-(--border) outline-none focus:border-(--gold) focus:ring-4 focus:ring-(--gold)/10 transition-all font-bold placeholder:text-(--text-muted) text-base shadow-xs"
              value={formData.endereco}
              onChange={e => setFormData(p => ({ ...p, endereco: e.target.value }))}
            />
          </div>

          <div className="space-y-2 focus-within:scale-[1.01] transition-transform">
            <label className="text-sm font-bold text-(--text-muted) ml-1 flex items-center gap-2">
              <UserCheck size={14} /> Gerente
            </label>
            <PremiumSelect 
              placeholder="Selecione um gestor..."
              options={users}
              value={formData.managerId}
              onChange={(e) => setFormData(p => ({ ...p, managerId: e.target.value }))}
            />
          </div>

          <div className="flex gap-4 pt-4 border-t border-(--border-subtle)">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 font-bold text-sm border border-(--border) text-(--text-muted) rounded-2xl hover:bg-(--surface-1) hover:text-(--text-secondary) transition-all active:scale-95 shadow-sm">
              Retornar
            </button>
            <button type="submit" disabled={loading}
              className="flex-2 bg-(--gold) text-(--on-gold) py-2.5 rounded-2xl  hover:shadow-xl transition-all font-bold text-base shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-3 active:scale-95 whitespace-nowrap">
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
