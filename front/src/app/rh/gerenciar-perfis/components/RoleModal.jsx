'use client';

import { Loader2, ShieldPlus, AlertTriangle, CheckSquare, Square } from 'lucide-react';
import { SYSTEM_MODULES } from '@/lib/permissions';
import { useRoleForm } from '../hooks/useRoleForm';

export default function RoleModal({ role = null, onClose, onRefresh }) {
  const {
    isEditing,
    formData,
    selectedPermissions,
    loading,
    error,
    isADM,
    handleInputChange,
    togglePermission,
    toggleCategory,
    handleSubmit
  } = useRoleForm(role, onClose, onRefresh);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1a1a1a] border border-zinc-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-zinc-800 shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-3 text-zinc-100">
            <div className="w-9 h-9 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700">
              <ShieldPlus size={18} className="text-[#e81cff]" />
            </div>
            {isEditing ? 'Editar Perfil de Acesso' : 'Novo Perfil de Acesso'}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors hover:bg-zinc-800 p-1.5 rounded-full cursor-pointer text-xl leading-none">&times;</button>
        </div>

        {/* Scrollable form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto custom-scrollbar flex-1 p-6 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3.5 rounded-xl text-sm flex items-start gap-2.5">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-400">Nome do Perfil *</label>
              <input
                required
                disabled={isADM}
                type="text"
                placeholder="Ex: SUPERVISOR"
                className="w-full bg-[#242424] text-white p-3 rounded-xl border border-zinc-700 outline-none focus:border-[#e81cff] focus:ring-1 focus:ring-[#e81cff]/50 transition-all placeholder:text-zinc-600 uppercase text-sm disabled:opacity-50"
                value={formData.nome}
                onChange={e => handleInputChange('nome', e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-400">Descrição</label>
              <input
                type="text"
                placeholder="Breve descrição do cargo..."
                className="w-full bg-[#242424] text-white p-3 rounded-xl border border-zinc-700 outline-none focus:border-[#e81cff] focus:ring-1 focus:ring-[#e81cff]/50 transition-all placeholder:text-zinc-600 text-sm"
                value={formData.descricao}
                onChange={e => handleInputChange('descricao', e.target.value)}
              />
            </div>
          </div>

          {/* Permissions Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-zinc-300">Acesso aos Módulos do Sistema</label>
              <span className="text-xs text-zinc-500 bg-zinc-800 px-2.5 py-1 rounded-full border border-zinc-700">
                {selectedPermissions.length} selecionada{selectedPermissions.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-3">
              {SYSTEM_MODULES.map((group) => {
                const groupKeys = group.modules.map(m => m.key);
                const allSelected = groupKeys.every(k => selectedPermissions.includes(k));
                const someSelected = groupKeys.some(k => selectedPermissions.includes(k));

                return (
                  <div key={group.category} className={`rounded-xl border ${group.borderColor} ${group.bgColor} overflow-hidden`}>
                    <button
                      type="button"
                      onClick={() => toggleCategory(group.modules)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {allSelected ? (
                          <CheckSquare size={16} className={group.color} />
                        ) : someSelected ? (
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center border-current ${group.color}`}>
                            <div className={`w-2 h-2 rounded-sm bg-current`} />
                          </div>
                        ) : (
                          <Square size={16} className="text-zinc-600" />
                        )}
                        <span className={`text-sm font-semibold ${group.color}`}>{group.category}</span>
                      </div>
                      <span className="text-xs text-zinc-600">
                        {groupKeys.filter(k => selectedPermissions.includes(k)).length}/{group.modules.length}
                      </span>
                    </button>

                    <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {group.modules.map((mod) => {
                        const checked = selectedPermissions.includes(mod.key);
                        return (
                          <label
                            key={mod.key}
                            onClick={() => togglePermission(mod.key)}
                            className="flex items-center gap-2.5 cursor-pointer group py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors select-none"
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                              checked ? 'bg-current border-transparent ' + group.color : 'bg-transparent border-zinc-600 group-hover:border-zinc-400'
                            }`}>
                              {checked && (
                                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </div>
                            <span className={`text-xs transition-colors ${checked ? 'text-zinc-200' : 'text-zinc-500 group-hover:text-zinc-400'}`}>
                              {mod.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-zinc-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 font-medium border border-zinc-700 text-zinc-400 rounded-xl hover:bg-zinc-800 hover:text-zinc-200 transition-colors text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="flex-1 bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] text-white py-3 rounded-xl hover:opacity-90 transition-all font-bold shadow-lg shadow-violet-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 text-sm"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Salvando...</>
            ) : (isEditing ? "Salvar Alterações" : "Cadastrar Perfil")}
          </button>
        </div>
      </div>
    </div>
  );
}
