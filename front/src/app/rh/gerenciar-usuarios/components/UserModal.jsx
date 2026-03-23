'use client';

import { Loader2, UserPlus, AlertTriangle } from 'lucide-react';
import { useUserForm } from '../hooks/useUserForm';

export default function UserModal({ userObj = null, onClose, onRefresh }) {
  const {
    isEditing,
    roles,
    filiais,
    isInitializing,
    loading,
    error,
    formData,
    handleInputChange,
    handleSubmit
  } = useUserForm(userObj, onClose, onRefresh);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#1f1f1f] border border-zinc-700 w-full max-w-lg p-6 sm:p-8 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        <div className="flex justify-between items-center mb-6 text-zinc-100">
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700 shadow-md">
                <UserPlus size={20} className="text-[#e81cff]" />
            </div>
            {isEditing ? 'Editar Usuário' : 'Novo Usuário'}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors bg-zinc-800/50 hover:bg-zinc-800 p-2 rounded-full cursor-pointer">&times;</button>
        </div>

        {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-6 text-sm flex items-start gap-3">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <p>{error}</p>
            </div>
        )}

        {isInitializing ? (
           <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 size={32} className="text-[#e81cff] animate-spin" />
              <p className="text-zinc-400 text-sm animate-pulse">Carregando permissões...</p>
           </div>
        ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300 ml-1">Nome Completo</label>
                <input 
                  required
                  type="text" 
                  placeholder="Ex: João da Silva"
                  className="w-full bg-[#2a2a2a] text-white p-3.5 rounded-xl border border-zinc-700 outline-none focus:border-[#e81cff] focus:ring-1 focus:ring-[#e81cff] transition-all placeholder:text-zinc-600"
                  value={formData.nome}
                  onChange={e => handleInputChange('nome', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300 ml-1">E-mail Corporativo</label>
                <input 
                  required
                  type="email" 
                  placeholder="joao@empresa.com.br"
                  className="w-full bg-[#2a2a2a] text-white p-3.5 rounded-xl border border-zinc-700 outline-none focus:border-[#e81cff] focus:ring-1 focus:ring-[#e81cff] transition-all placeholder:text-zinc-600"
                  value={formData.email}
                  onChange={e => handleInputChange('email', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300 ml-1">{isEditing ? 'Nova Senha (deixe em branco para não alterar)' : 'Senha Padrão Provisória'}</label>
                <input 
                  required={!isEditing}
                  type="password" 
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-[#2a2a2a] text-white p-3.5 rounded-xl border border-zinc-700 outline-none focus:border-[#e81cff] focus:ring-1 focus:ring-[#e81cff] transition-all placeholder:text-zinc-600"
                  value={formData.password}
                  onChange={e => handleInputChange('password', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-300 ml-1">Perfil de Acesso</label>
                  <select 
                      required
                      className="w-full bg-[#2a2a2a] text-white p-3.5 rounded-xl border border-zinc-700 outline-none focus:border-[#e81cff] transition-all cursor-pointer"
                      value={formData.roleId}
                      onChange={e => handleInputChange('roleId', e.target.value)}
                  >
                  <option value="" disabled>Selecione...</option>
                  {roles.map(role => (
                      <option key={role.id} value={role.id}>{role.nome}</option>
                  ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-300 ml-1">Filial Associada</label>
                  <select 
                      required
                      className="w-full bg-[#2a2a2a] text-white p-3.5 rounded-xl border border-zinc-700 outline-none focus:border-[#e81cff] transition-all cursor-pointer"
                      value={formData.filialId}
                      onChange={e => handleInputChange('filialId', e.target.value)}
                  >
                  <option value="" disabled>Selecione...</option>
                  {filiais.map(filial => (
                      <option key={filial.id} value={filial.id}>{filial.nome}</option>
                  ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300 ml-1">Status do Usuário</label>
                <select 
                    className="w-full bg-[#2a2a2a] text-white p-3.5 rounded-xl border border-zinc-700 outline-none focus:border-[#e81cff] transition-all cursor-pointer"
                    value={formData.ativo.toString()}
                    onChange={e => handleInputChange('ativo', e.target.value === 'true')}
                >
                  <option value="true">Ativo e operante</option>
                  <option value="false">Desativado (Sem acesso)</option>
                </select>
              </div>

              <div className="flex gap-4 mt-6 pt-4 border-t border-zinc-800">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="flex-1 py-3.5 font-medium border border-zinc-600 text-zinc-300 rounded-xl hover:bg-zinc-800 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={loading || roles.length === 0}
                  className="flex-1 bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] text-white py-3.5 rounded-xl hover:opacity-90 transition-all font-bold shadow-lg shadow-violet-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {loading ? (
                    <><Loader2 size={18} className="animate-spin" /> Salvando...</>
                  ) : (
                    isEditing ? "Salvar Alterações" : "Cadastrar Usuário"
                  )}
                </button>
              </div>
            </form>
        )}
      </div>
    </div>
  );
}
