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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/10 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden relative">

        {/* Header */}
        <div className="flex justify-between items-center p-8 border-b border-slate-100 shrink-0">
          <h2 className="text-xl sm:text-3xl font-black tracking-tight flex items-center gap-4 text-slate-900">
            <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center border border-sky-100 shadow-sm">
              <ShieldPlus size={24} className="text-sky-600" />
            </div>
            {isEditing ? 'Configurar Perfil' : 'Novo Perfil'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 transition-all bg-slate-50 hover:bg-slate-100 p-2.5 rounded-full cursor-pointer border border-slate-100 flex items-center justify-center active:scale-90">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Scrollable form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto custom-scrollbar flex-1 p-8 space-y-8 bg-white">
          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl text-sm font-bold flex items-start gap-3 shadow-sm">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5 focus-within:scale-[1.01] transition-transform">
              <label className="text-xs font-bold text-slate-400 ml-1">Identificador do Perfil *</label>
              <input
                required
                disabled={isADM}
                type="text"
                placeholder="Ex: GERENTE_VENDAS"
                className="w-full bg-slate-50 text-slate-900 p-4 rounded-2xl border border-slate-200 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all font-black placeholder:text-slate-300 text-sm disabled:opacity-50"
                value={formData.nome}
                onChange={e => handleInputChange('nome', e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-1.5 focus-within:scale-[1.01] transition-transform">
              <label className="text-xs font-bold text-slate-400 ml-1">Descrição Breve</label>
              <input
                type="text"
                placeholder="Ex: Responsável pela filial..."
                className="w-full bg-slate-50 text-slate-900 p-4 rounded-2xl border border-slate-200 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all font-bold placeholder:text-slate-300 text-sm"
                value={formData.descricao}
                onChange={e => handleInputChange('descricao', e.target.value)}
              />
            </div>
          </div>

          {/* Permissions Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <label className="text-sm font-bold text-slate-800">Matriz de Acessos</label>
              <span className="text-xs font-semibold text-sky-600 bg-sky-50 px-3 py-1 rounded-full border border-sky-100 shadow-sm">
                {selectedPermissions.length} Módulos Ativos
              </span>
            </div>

            <div className="space-y-4">
              {SYSTEM_MODULES.map((group) => {
                const groupKeys = group.modules.map(m => m.key);
                const allSelected = groupKeys.every(k => selectedPermissions.includes(k));
                const someSelected = groupKeys.some(k => selectedPermissions.includes(k));

                return (
                  <div key={group.category} className={`rounded-2xl border ${group.borderColor} ${group.bgColor} shadow-sm overflow-hidden transition-all hover:shadow-md`}>
                    <button
                      type="button"
                      onClick={() => toggleCategory(group.modules)}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1 rounded-lg ${allSelected ? 'bg-current text-white' : 'bg-white border-2 border-slate-200'} transition-all`}>
                          {allSelected ? (
                            <CheckSquare size={16} className={group.color} />
                          ) : someSelected ? (
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center border-current ${group.color}`}>
                              <div className={`w-2 h-2 rounded-sm bg-current`} />
                            </div>
                          ) : (
                            <Square size={16} className="text-slate-200" />
                          )}
                        </div>
                        <span className={`text-sm font-black tracking-tight ${group.color}`}>{group.category}</span>
                      </div>
                      <span className="text-xs font-medium text-slate-400 bg-white/60 px-2 py-0.5 rounded-lg">
                        {groupKeys.filter(k => selectedPermissions.includes(k)).length} / {group.modules.length}
                      </span>
                    </button>

                    <div className="px-6 pb-4 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.modules.map((mod) => {
                        const checked = selectedPermissions.includes(mod.key);
                        return (
                          <label
                            key={mod.key}
                            onClick={() => togglePermission(mod.key)}
                            className={`flex items-center gap-3 cursor-pointer group py-2.5 px-3 rounded-xl transition-all select-none border border-transparent ${
                              checked ? 'bg-white shadow-sm border-slate-100' : 'hover:bg-white/30'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                              checked ? 'bg-current border-transparent ' + group.color : 'bg-transparent border-slate-200 group-hover:border-slate-300'
                            }`}>
                              {checked && (
                                <svg width="12" height="10" viewBox="0 0 10 8" fill="none">
                                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </div>
                            <span className={`text-xs font-bold transition-colors ${checked ? 'text-slate-800' : 'text-slate-400 group-hover:text-slate-600'}`}>
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
        <div className="flex gap-4 p-8 border-t border-slate-100 shrink-0 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 font-bold text-xs border border-slate-200 text-slate-400 rounded-2xl hover:bg-white hover:text-slate-600 transition-all active:scale-95 shadow-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="flex-2 bg-linear-to-br from-sky-400 to-sky-600 text-white py-3 rounded-2xl hover:shadow-sky-200/50 hover:shadow-xl transition-all font-bold text-sm shadow-lg shadow-sky-900/10 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-3 active:scale-95"
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Sincronizando...</>
            ) : (
              <> {isEditing ? "Atualizar Privilégios" : "Efetivar Novo Perfil"} </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
