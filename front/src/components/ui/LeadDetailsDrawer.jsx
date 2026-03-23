import { X, User, Phone, MapPin, Building2, Tag, Calendar, Globe, Megaphone, Handshake, Info, ShieldCheck } from 'lucide-react';
import { formatPhone } from '@/lib/utils';
import { useEffect } from 'react';

export default function LeadDetailsDrawer({ lead, isOpen, onClose }) {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-100 transition-opacity duration-300 ease-in-out backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={`fixed inset-y-0 right-0 z-101 w-full max-w-md bg-[#1a1a1a] shadow-2xl border-l border-zinc-800 flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-[#1c1c1c] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-linear-to-br from-[#0ea5e9] to-[#0284c7] flex items-center justify-center text-white shadow-lg shadow-sky-900/20">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100 truncate max-w-[250px]">{lead?.nome || 'Lead Sem Nome'}</h2>
              <p className="text-xs text-zinc-500 font-medium tracking-wide">
                CRIADO EM {formatDate(lead?.createdAt)}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 select-text">
          
          {/* Status & Etapa Flags */}
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                lead?.status === 'Ativo' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
              <ShieldCheck size={14} />
              {lead?.status || 'Ativo'}
            </span>
            <span className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-zinc-800/50 text-zinc-300 border border-zinc-700/50 flex items-center gap-1.5">
              <Info size={14} className="text-[#0ea5e9]"/>
              {lead?.etapa || '—'}
            </span>
          </div>

          {/* Cards de Informações */}
          
          {/* Contato Principal */}
          <div>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Phone size={14} /> Contato
            </h3>
            <div className="bg-[#242424] rounded-2xl p-4 border border-zinc-800/80 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Telefone</span>
                <span className="text-sm font-medium text-zinc-200">{lead?.telefone ? formatPhone(lead.telefone) : '—'}</span>
              </div>
              <div className="flex justify-between items-center border-t border-zinc-800/50 pt-3">
                <span className="text-sm text-zinc-400">Email (Se houver)</span>
                <span className="text-sm font-medium text-zinc-200">{lead?.email || '—'}</span>
              </div>
            </div>
          </div>

          {/* Atribuição */}
          <div>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <MapPin size={14} /> Atribuição
            </h3>
            <div className="bg-[#242424] rounded-2xl p-4 border border-zinc-800/80 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Filial</span>
                <span className="text-sm font-medium text-zinc-200">{lead?.filial?.nome || '—'}</span>
              </div>
              <div className="flex justify-between items-center border-t border-zinc-800/50 pt-3">
                <span className="text-sm text-zinc-400">Responsável</span>
                <span className="text-sm font-medium text-[#0ea5e9] bg-[#0ea5e9]/10 px-2 py-0.5 rounded-lg">{lead?.user?.nome || '—'}</span>
              </div>
              {lead?.gerente && (
                <div className="flex justify-between items-center border-t border-zinc-800/50 pt-3">
                  <span className="text-sm text-zinc-400">Gerente do Lead</span>
                  <span className="text-sm font-medium text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-lg">{lead.gerente.nome}</span>
                </div>
              )}
            </div>
          </div>

          {/* Interesse */}
          <div>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Building2 size={14} /> Perfil do Imóvel Buscado
            </h3>
            <div className="bg-[#242424] rounded-2xl p-4 border border-zinc-800/80 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Tipo de Imóvel</span>
                <span className="text-sm font-medium text-zinc-200">{lead?.tipoImovel || 'Não Informado'}</span>
              </div>
              <div className="flex justify-between items-center border-t border-zinc-800/50 pt-3">
                <span className="text-sm text-zinc-400">Status Preferencial</span>
                <span className="text-sm font-medium text-zinc-200">{lead?.statusImovel || '—'}</span>
              </div>
            </div>
          </div>

          {/* Marketing & Aquisição */}
          <div>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Globe size={14} /> Marketing e Aquisição
            </h3>
            <div className="bg-[#242424] rounded-2xl p-4 border border-zinc-800/80 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400 flex items-center gap-1.5"><Megaphone size={14}/> Canal</span>
                <span className="text-sm font-medium text-zinc-200">{lead?.canal || '—'}</span>
              </div>
              <div className="flex justify-between items-center border-t border-zinc-800/50 pt-3">
                <span className="text-sm text-zinc-400 flex items-center gap-1.5"><Tag size={14}/> Origem</span>
                <span className="text-sm font-medium text-zinc-200">{lead?.origem || '—'}</span>
              </div>
              <div className="flex justify-between items-center border-t border-zinc-800/50 pt-3">
                <span className="text-sm text-zinc-400 flex items-center gap-1.5"><Handshake size={14}/> Parceria</span>
                <span className="text-sm font-medium text-zinc-200">{lead?.parceria || 'Não'}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800 bg-[#1c1c1c] shrink-0">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium rounded-xl transition-colors text-sm shadow-sm"
          >
            Fechar Aba
          </button>
        </div>
      </div>
    </>
  );
}
