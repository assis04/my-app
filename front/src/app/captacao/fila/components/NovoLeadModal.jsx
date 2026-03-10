'use client';

import { useState } from 'react';
import { Loader2, UserPlus, AlertTriangle, ChevronDown } from 'lucide-react';

export default function NovoLeadModal({ 
  initialPhone = '', 
  agentId = null, 
  agentName = '', 
  branchId = null,
  branchName = '',
  sellers = [],   // lista de vendedores da fila para o dropdown
  onClose, 
  onSave 
}) {
  const [formData, setFormData] = useState({
    nome: '',
    telefone: initialPhone,
  });

  const [selectedAgentId, setSelectedAgentId] = useState(agentId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Derive the selected agent name from the sellers list or fallback
  const selectedAgent = sellers.find(s => s.id === selectedAgentId);
  const displayAgentName = selectedAgent?.nome || agentName || 'Não definido';

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    
    if (!formData.telefone) { 
      setError('O telefone é obrigatório.'); 
      return; 
    }

    if (!selectedAgentId) {
      setError('Selecione um responsável para o lead.');
      return;
    }
    
    setLoading(true);

    try {
      await onSave({
        nome: formData.nome,
        telefone: formData.telefone,
        branch_id: branchId,
        assigned_user_id: selectedAgentId
      });
      onClose();
    } catch (err) {
      setError(typeof err === 'string' ? err : err.message || 'Erro ao atribuir lead.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1a1a1a] border border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-zinc-800 shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-3 text-zinc-100">
            <div className="w-9 h-9 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700">
              <UserPlus size={18} className="text-[#0ea5e9]" />
            </div>
            Novo Lead Manual
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors hover:bg-zinc-800 p-1.5 rounded-full cursor-pointer text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3.5 rounded-xl text-sm flex items-start gap-2.5">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Telefone */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-400">Telefone *</label>
              <input
                required 
                type="text" 
                placeholder="(xx) xxxxx-xxxx"
                className="w-full bg-[#242424] text-white p-3 rounded-xl border border-zinc-700 outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]/50 transition-all font-medium tracking-wide placeholder:text-zinc-600 text-sm"
                value={formData.telefone}
                onChange={e => setFormData(p => ({ ...p, telefone: e.target.value }))}
              />
            </div>
            
            {/* Nome do Lead */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-400">Nome do Lead (Opcional)</label>
              <input
                type="text" 
                placeholder="Ex: João Silva"
                className="w-full bg-[#242424] text-white p-3 rounded-xl border border-zinc-700 outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]/50 transition-all placeholder:text-zinc-600 text-sm"
                value={formData.nome}
                onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))}
              />
            </div>

            {/* Responsável (Seller dropdown) */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-400">Responsável *</label>
              <div className="relative">
                <select
                  value={selectedAgentId || ''}
                  onChange={(e) => setSelectedAgentId(Number(e.target.value))}
                  className="appearance-none w-full bg-[#242424] text-white p-3 pr-10 rounded-xl border border-zinc-700 outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]/50 transition-all text-sm cursor-pointer"
                >
                  <option value="" disabled className="bg-zinc-800 text-zinc-500">Selecione um vendedor...</option>
                  {sellers.map(seller => (
                    <option 
                      key={seller.id} 
                      value={seller.id}
                      disabled={!seller.isAvailable}
                      className="bg-zinc-800 text-zinc-200"
                    >
                      {seller.nome} {!seller.isAvailable ? '(Off)' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Info card showing the selected agent */}
          {selectedAgentId && (
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 flex flex-col gap-1 text-sm text-zinc-300">
              <div className="flex justify-between border-b border-zinc-700/50 pb-2 mb-2">
                <span className="text-zinc-500">Destino:</span>
                <span className="font-semibold text-emerald-400">{displayAgentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Filial:</span>
                <span className="font-medium text-zinc-200">{branchName || `#${branchId}`}</span>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-zinc-800 shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 py-3 font-medium border border-zinc-700 text-zinc-400 rounded-xl hover:bg-zinc-800 hover:text-zinc-200 transition-colors text-sm">
            Cancelar
          </button>
          <button type="button" disabled={loading} onClick={handleSubmit}
            className="flex-1 bg-linear-to-r from-[#0ea5e9] to-[#0284c7] text-white py-3 rounded-xl hover:opacity-90 transition-all font-bold shadow-lg shadow-sky-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 text-sm">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Distribuindo...</> : 'Confirmar e Atribuir'}
          </button>
        </div>
      </div>
    </div>
  );
}
