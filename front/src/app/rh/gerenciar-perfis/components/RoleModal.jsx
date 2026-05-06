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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-(--surface-4)/10 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-(--surface-2) border border-(--border) w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden relative">

        {/* Header */}
        <div className="flex justify-between items-center p-8 border-b border-(--border-subtle) shrink-0">
          <h2 className="text-xl sm:text-3xl font-black tracking-tight flex items-center gap-4 text-(--text-primary)">
            <div className="w-12 h-12 bg-(--gold-soft) rounded-2xl flex items-center justify-center border border-(--gold-soft) shadow-sm">
              <ShieldPlus size={24} className="text-(--gold)" />
            </div>
            {isEditing ? 'Configurar Perfil' : 'Novo Perfil'}
          </h2>
          <button onClick={onClose} className="text-(--text-muted) hover:text-(--text-primary) transition-all bg-(--surface-1) hover:bg-(--surface-3) p-2.5 rounded-full cursor-pointer border border-(--border-subtle) flex items-center justify-center active:scale-90">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Scrollable form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto custom-scrollbar flex-1 p-8 space-y-8 bg-(--surface-2)">
          {error && (
            <div className="bg-(--danger-soft) border border-(--danger)/30 text-(--danger) p-4 rounded-2xl text-base font-bold flex items-start gap-3 shadow-sm">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5 focus-within:scale-[1.01] transition-transform">
              <label className="text-sm font-bold text-(--text-muted) ml-1">Identificador do Perfil *</label>
              <input
                required
                disabled={isADM}
                type="text"
                placeholder="Ex: GERENTE_VENDAS"
                className="w-full bg-(--surface-1) text-(--text-primary) p-3 rounded-2xl border border-(--border) outline-none focus:border-(--gold) focus:ring-4 focus:ring-(--gold)/10 transition-all font-black placeholder:text-(--text-muted) text-base disabled:opacity-50"
                value={formData.nome}
                onChange={e => handleInputChange('nome', e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-1.5 focus-within:scale-[1.01] transition-transform">
              <label className="text-sm font-bold text-(--text-muted) ml-1">Descrição Breve</label>
              <input
                type="text"
                placeholder="Ex: Responsável pela filial..."
                className="w-full bg-(--surface-1) text-(--text-primary) p-3 rounded-2xl border border-(--border) outline-none focus:border-(--gold) focus:ring-4 focus:ring-(--gold)/10 transition-all font-bold placeholder:text-(--text-muted) text-base"
                value={formData.descricao}
                onChange={e => handleInputChange('descricao', e.target.value)}
              />
            </div>
          </div>

          {/* Permissions Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-(--border-subtle)">
              <label className="text-base font-bold text-(--text-primary)">Matriz de Acessos</label>
              <span className="text-sm font-semibold text-(--gold) bg-(--gold-soft) px-3 py-1 rounded-full border border-(--gold-soft) shadow-sm">
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
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-(--surface-2)/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1 rounded-lg ${allSelected ? 'bg-current text-white' : 'bg-(--surface-2) border-2 border-(--border)'} transition-all`}>
                          {allSelected ? (
                            <CheckSquare size={16} className={group.color} />
                          ) : someSelected ? (
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center border-current ${group.color}`}>
                              <div className={`w-2 h-2 rounded-sm bg-current`} />
                            </div>
                          ) : (
                            <Square size={16} className="text-(--text-faint)" />
                          )}
                        </div>
                        <span className={`text-base font-black tracking-tight ${group.color}`}>{group.category}</span>
                      </div>
                      <span className="text-sm font-medium text-(--text-muted) bg-(--surface-2)/60 px-2 py-0.5 rounded-lg">
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
                              checked ? 'bg-(--surface-2) shadow-sm border-(--border-subtle)' : 'hover:bg-(--surface-2)/30'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                              checked ? 'bg-current border-transparent ' + group.color : 'bg-transparent border-(--border) group-hover:border-(--border)'
                            }`}>
                              {checked && (
                                <svg width="12" height="10" viewBox="0 0 10 8" fill="none">
                                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </div>
                            <span className={`text-sm font-bold transition-colors ${checked ? 'text-(--text-primary)' : 'text-(--text-muted) group-hover:text-(--text-secondary)'}`}>
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
        <div className="flex gap-4 p-8 border-t border-(--border-subtle) shrink-0 bg-(--surface-1)/50">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 font-bold text-sm border border-(--border) text-(--text-muted) rounded-2xl hover:bg-(--surface-2) hover:text-(--text-secondary) transition-all active:scale-95 shadow-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="flex-2 bg-(--gold) text-(--on-gold) py-2.5 rounded-2xl  hover:shadow-xl transition-all font-bold text-base shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-3 active:scale-95 whitespace-nowrap"
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
