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
        className="fixed inset-0 bg-slate-900/40 z-100 transition-opacity duration-300 ease-in-out backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={`fixed inset-y-0 right-0 z-101 w-full max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-sky-500 to-sky-600 flex items-center justify-center text-white shadow-xl shadow-sky-200">
              <User size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 truncate max-w-[250px] tracking-tight">{lead?.nome || 'Lead Sem Nome'}</h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Criado em {formatDate(lead?.createdAt)}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10 select-text bg-white">
          
          {/* Status & Etapa Flags */}
          <div className="flex items-center gap-3">
            <span className={`px-4 py-2 rounded-full text-xs font-semibold border flex items-center gap-2 shadow-sm ${
                lead?.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
              }`}>
              <ShieldCheck size={14} />
              {lead?.status || 'Ativo'}
            </span>
            <span className="px-4 py-2 rounded-full text-xs font-semibold bg-slate-50 text-slate-500 border border-slate-100 flex items-center gap-2 shadow-sm">
              <Info size={14} className="text-sky-500"/>
              {lead?.etapa || 'Novo'}
            </span>
          </div>

          {/* Cards de Informações */}
          
          {/* Contato Principal */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 mb-4 flex items-center gap-2">
              <Phone size={14} className="text-sky-500" /> Contato Direto
            </h3>
            <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100 space-y-4 shadow-inner">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-500">Telefone</span>
                <span className="text-base font-black text-slate-900">{(lead?.celular || lead?.telefone) ? formatPhone(lead.celular || lead.telefone) : '—'}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                <span className="text-sm font-bold text-slate-500">E-mail</span>
                <span className="text-sm font-bold text-sky-600 underline decoration-sky-200 underline-offset-4">{lead?.email || '—'}</span>
              </div>
            </div>
          </div>

          {/* Atribuição */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 mb-4 flex items-center gap-2">
              <MapPin size={14} className="text-sky-500" /> Distribuição e Posse
            </h3>
            <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100 space-y-4 shadow-inner">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-500">Filial</span>
                <span className="text-sm font-black text-slate-800">{lead?.filial?.nome || '—'}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                <span className="text-sm font-bold text-slate-500">Responsável Atual</span>
                <span className="text-sm font-black text-sky-600 bg-sky-50 px-3 py-1 rounded-xl border border-sky-100 shadow-sm">{lead?.vendedor?.nome || lead?.user?.nome || '—'}</span>
              </div>
              {lead?.gerente && (
                <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                  <span className="text-sm font-bold text-slate-500">Gerente Responsável</span>
                  <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-100 shadow-sm">{lead.gerente.nome}</span>
                </div>
              )}
            </div>
          </div>

          {/* Interesse */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 mb-4 flex items-center gap-2">
              <Building2 size={14} className="text-sky-500" /> Perfil de Interesse
            </h3>
            <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100 space-y-4 shadow-inner">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-500">Tipo de Ativo</span>
                <span className="text-sm font-black text-slate-800">{lead?.tipoImovel || 'Não Informado'}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                <span className="text-sm font-bold text-slate-500">Status Desejado</span>
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">{lead?.statusImovel || '—'}</span>
              </div>
            </div>
          </div>

          {/* Marketing & Aquisição */}
          <div className="pb-10">
            <h3 className="text-xs font-bold text-slate-400 mb-4 flex items-center gap-2">
              <Globe size={14} className="text-sky-500" /> Inteligência de Marketing
            </h3>
            <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100 space-y-4 shadow-inner">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-500 flex items-center gap-2"><Megaphone size={14} className="text-slate-400"/> Canal</span>
                <span className="text-xs font-semibold text-slate-700 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm">{lead?.canal || '—'}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                <span className="text-sm font-bold text-slate-500 flex items-center gap-2"><Tag size={14} className="text-slate-400"/> Origem</span>
                <span className="text-sm font-bold text-slate-600 italic">“{lead?.origem || 'Direto'}”</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                <span className="text-sm font-bold text-slate-500 flex items-center gap-2"><Handshake size={14} className="text-slate-400"/> Parceria</span>
                <span className={`text-xs font-semibold px-2 py-1 rounded border ${lead?.parceria === 'Sim' ? 'bg-sky-50 text-sky-600 border-sky-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                  {lead?.parceria || 'Não'}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-8 border-t border-slate-100 bg-white shrink-0">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-slate-900 hover:bg-black text-white font-bold text-sm rounded-2xl transition-all shadow-lg active:scale-95"
          >
            Fechar Painel
          </button>
        </div>
      </div>
    </>
  );
}
