'use client';

import { Loader2, UserPlus, AlertTriangle } from 'lucide-react';
import { useUserForm } from '../hooks/useUserForm';
import PremiumSelect from '@/components/ui/PremiumSelect';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-(--surface-4)/10 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-(--surface-2)/90 backdrop-blur-xl border border-white/40 w-full max-w-4xl rounded-2xl shadow-floating flex flex-col max-h-[92vh] overflow-hidden translate-y-0 transform transition-all page-transition">
        
        <div className="flex justify-between items-center mb-8 text-(--text-primary)">
          <h2 className="text-xl sm:text-3xl font-black tracking-tight flex items-center gap-4">
            <div className="w-12 h-12 bg-(--gold-soft) rounded-2xl flex items-center justify-center border border-(--gold-soft) shadow-sm">
                <UserPlus size={24} className="text-(--gold)" />
            </div>
            {isEditing ? 'Editar Colaborador' : 'Novo Colaborador'}
          </h2>
          <button onClick={onClose} className="text-(--text-muted) hover:text-(--text-primary) transition-all bg-(--surface-1) hover:bg-(--surface-3) p-2.5 rounded-full cursor-pointer border border-(--border-subtle) flex items-center justify-center active:scale-90">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {error && (
            <div className="bg-(--danger)/10 border border-(--danger) text-(--danger) p-4 rounded-xl mb-6 text-base flex items-start gap-3">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <p>{error}</p>
            </div>
        )}

        {isInitializing ? (
           <div className="flex flex-col items-center justify-center py-20 gap-4 bg-(--surface-1)/50 rounded-2xl border border-dashed border-(--border)">
              <Loader2 size={36} className="text-(--gold) animate-spin" />
              <p className="text-(--text-muted) text-base font-medium animate-pulse">Carregando permissões...</p>
           </div>
        ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="space-y-1.5 focus-within:scale-[1.01] transition-transform">
                <label className="text-sm font-bold text-(--text-muted) ml-1">Nome Completo</label>
                <input 
                  required
                  type="text" 
                  placeholder="Ex: Thiago Ribeiro"
                  className="premium-input p-3 text-base"
                  value={formData.nome}
                  onChange={e => handleInputChange('nome', e.target.value)}
                />
              </div>

              <div className="space-y-1.5 focus-within:scale-[1.01] transition-transform">
                <label className="text-sm font-bold text-(--text-muted) ml-1">E-mail Corporativo</label>
                <input 
                  required
                  type="email" 
                  placeholder="thiago@empresa.com.br"
                  className="premium-input p-3 text-base"
                  value={formData.email}
                  onChange={e => handleInputChange('email', e.target.value)}
                />
              </div>

              <div className="space-y-1.5 focus-within:scale-[1.01] transition-transform">
                <label className="text-sm font-bold text-(--text-muted) ml-1">{isEditing ? 'Segurança (Nova Senha)' : 'Senha Provisória'}</label>
                <input 
                  required={!isEditing}
                  type="password" 
                  placeholder={isEditing ? "Deixe vazio para manter atual" : "Mínimo 6 caracteres"}
                  className="premium-input p-3 text-base"
                  value={formData.password}
                  onChange={e => handleInputChange('password', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 focus-within:scale-[1.01] transition-transform">
                  <label className="text-sm font-bold text-(--text-muted) ml-1">Perfil de Acesso</label>
                  <PremiumSelect 
                    options={roles}
                    value={formData.roleId}
                    onChange={e => handleInputChange('roleId', e.target.value)}
                    placeholder="Selecione o Perfil"
                  />
                </div>

                <div className="space-y-1.5 focus-within:scale-[1.01] transition-transform">
                  <label className="text-sm font-bold text-(--text-muted) ml-1">Filial Associada</label>
                  <PremiumSelect 
                    options={filiais}
                    value={formData.filialId}
                    onChange={e => handleInputChange('filialId', e.target.value)}
                    placeholder="Selecione a Unidade"
                  />
                </div>
              </div>

              <div className="space-y-1.5 focus-within:scale-[1.01] transition-transform">
                <label className="text-sm font-bold text-(--text-muted) ml-1">Status do Registro</label>
                <PremiumSelect 
                  options={[
                    { id: 'true', nome: 'Ativo e Liberado' },
                    { id: 'false', nome: 'Bloqueado / Inativo' }
                  ]}
                  value={formData.ativo.toString()}
                  onChange={e => handleInputChange('ativo', e.target.value === 'true')}
                />
              </div>

              <div className="flex gap-4 mt-8 pt-8 border-t border-(--border-subtle)">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="flex-1 py-3 font-bold text-sm border border-(--border) text-(--text-muted) rounded-2xl hover:bg-(--surface-1) hover:text-(--text-secondary) transition-all active:scale-95"
                >
                  Descartar
                </button>
                <button type="button" disabled={loading} onClick={handleSubmit}
                  className="flex-2 bg-(--gold) text-(--on-gold) py-2.5 rounded-2xl  hover:shadow-xl transition-all font-bold text-base shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-3 active:scale-95 whitespace-nowrap">
            {loading ? <><Loader2 size={18} className="animate-spin" /> Sincronizando...</> : isEditing ? 'Atualizar Colaborador' : 'Confirmar e Sincronizar'}
          </button>
              </div>
            </form>
        )}
      </div>
    </div>
  );
}
