import { X, User, Phone, MapPin, Building2, Tag, Calendar, Globe, Megaphone, Handshake, Info, ShieldCheck } from 'lucide-react';
import { formatPhone } from '@/lib/utils';
import { useEffect } from 'react';

export default function LeadDetailsDrawer({ lead, isOpen, onClose }) {
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
        className="fixed inset-0 bg-black/70 z-100 transition-opacity duration-300 ease-in-out backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`fixed inset-y-0 right-0 z-101 w-full max-w-md bg-(--surface-2) shadow-(--shadow-floating) border-l border-(--border) flex flex-col transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-(--border-subtle) shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-(--gold) flex items-center justify-center text-(--on-gold) shadow-[0_8px_24px_-8px_rgba(233,182,1,0.45)]">
              <User size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-(--text-primary) truncate max-w-[250px] tracking-tight">{lead?.nome || 'Lead Sem Nome'}</h2>
              <p className="text-sm text-(--text-muted) font-medium mt-0.5">
                Criado em {formatDate(lead?.createdAt)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-(--text-muted) hover:text-(--text-primary) hover:bg-(--surface-3) rounded-xl transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10 select-text">

          {/* Status & Etapa Flags */}
          <div className="flex items-center gap-3">
            <span className={`px-4 py-2 rounded-full text-sm font-semibold border flex items-center gap-2 ${
                lead?.status === 'Ativo' ? 'bg-(--success-soft) text-(--success) border-(--success)/40' : 'bg-(--danger-soft) text-(--danger) border-(--danger)/40'
              }`}>
              <ShieldCheck size={14} />
              {lead?.status || 'Ativo'}
            </span>
            <span className="px-4 py-2 rounded-full text-sm font-semibold bg-(--surface-3) text-(--text-secondary) border border-(--border-subtle) flex items-center gap-2">
              <Info size={14} className="text-(--gold)"/>
              {lead?.etapa || 'Novo'}
            </span>
          </div>

          {/* Contato Principal */}
          <div>
            <h3 className="text-sm font-bold text-(--text-muted) mb-4 flex items-center gap-2">
              <Phone size={14} className="text-(--gold)" /> Contato Direto
            </h3>
            <div className="bg-(--surface-1) rounded-3xl p-6 border border-(--border-subtle) space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-base font-bold text-(--text-muted)">Telefone</span>
                <span className="text-base font-black text-(--text-primary)">{(lead?.celular || lead?.telefone) ? formatPhone(lead.celular || lead.telefone) : '—'}</span>
              </div>
              <div className="flex justify-between items-center border-t border-(--border-subtle) pt-4">
                <span className="text-base font-bold text-(--text-muted)">E-mail</span>
                <span className="text-base font-bold text-(--gold) underline decoration-(--gold-soft) underline-offset-4">{lead?.email || '—'}</span>
              </div>
            </div>
          </div>

          {/* Atribuição */}
          <div>
            <h3 className="text-sm font-bold text-(--text-muted) mb-4 flex items-center gap-2">
              <MapPin size={14} className="text-(--gold)" /> Distribuição e Posse
            </h3>
            <div className="bg-(--surface-1) rounded-3xl p-6 border border-(--border-subtle) space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-base font-bold text-(--text-muted)">Filial</span>
                <span className="text-base font-black text-(--text-primary)">{lead?.filial?.nome || '—'}</span>
              </div>
              <div className="flex justify-between items-center border-t border-(--border-subtle) pt-4">
                <span className="text-base font-bold text-(--text-muted)">Responsável Atual</span>
                <span className="text-base font-black text-(--gold) bg-(--gold-soft) px-3 py-1 rounded-xl border border-(--gold)/30">{lead?.vendedor?.nome || lead?.user?.nome || '—'}</span>
              </div>
              {lead?.gerente && (
                <div className="flex justify-between items-center border-t border-(--border-subtle) pt-4">
                  <span className="text-base font-bold text-(--text-muted)">Gerente Responsável</span>
                  <span className="text-base font-black text-(--text-primary) bg-(--surface-3) px-3 py-1 rounded-xl border border-(--border)">{lead.gerente.nome}</span>
                </div>
              )}
            </div>
          </div>

          {/* Interesse */}
          <div>
            <h3 className="text-sm font-bold text-(--text-muted) mb-4 flex items-center gap-2">
              <Building2 size={14} className="text-(--gold)" /> Perfil de Interesse
            </h3>
            <div className="bg-(--surface-1) rounded-3xl p-6 border border-(--border-subtle) space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-base font-bold text-(--text-muted)">Tipo de Ativo</span>
                <span className="text-base font-black text-(--text-primary)">{lead?.tipoImovel || 'Não Informado'}</span>
              </div>
              <div className="flex justify-between items-center border-t border-(--border-subtle) pt-4">
                <span className="text-base font-bold text-(--text-muted)">Status Desejado</span>
                <span className="text-sm font-semibold text-(--text-secondary) bg-(--surface-3) px-2 py-1 rounded border border-(--border-subtle)">{lead?.statusImovel || '—'}</span>
              </div>
            </div>
          </div>

          {/* Marketing & Aquisição */}
          <div className="pb-10">
            <h3 className="text-sm font-bold text-(--text-muted) mb-4 flex items-center gap-2">
              <Globe size={14} className="text-(--gold)" /> Inteligência de Marketing
            </h3>
            <div className="bg-(--surface-1) rounded-3xl p-6 border border-(--border-subtle) space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-base font-bold text-(--text-muted) flex items-center gap-2"><Megaphone size={14} className="text-(--text-faint)"/> Canal</span>
                <span className="text-sm font-semibold text-(--text-primary) bg-(--surface-3) px-3 py-1 rounded-lg border border-(--border-subtle)">{lead?.canal || '—'}</span>
              </div>
              <div className="flex justify-between items-center border-t border-(--border-subtle) pt-4">
                <span className="text-base font-bold text-(--text-muted) flex items-center gap-2"><Tag size={14} className="text-(--text-faint)"/> Origem</span>
                <span className="text-base font-bold text-(--text-secondary) italic">“{lead?.origem || 'Direto'}”</span>
              </div>
              <div className="flex justify-between items-center border-t border-(--border-subtle) pt-4">
                <span className="text-base font-bold text-(--text-muted) flex items-center gap-2"><Handshake size={14} className="text-(--text-faint)"/> Parceria</span>
                <span className={`text-sm font-semibold px-2 py-1 rounded border ${lead?.parceria === 'Sim' ? 'bg-(--gold-soft) text-(--gold) border-(--gold)/30' : 'bg-(--surface-3) text-(--text-faint) border-(--border-subtle)'}`}>
                  {lead?.parceria || 'Não'}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-8 border-t border-(--border-subtle) shrink-0">
          <button
            onClick={onClose}
            className="w-full py-4 bg-(--gold) hover:bg-(--gold-hover) text-(--on-gold) font-bold text-base rounded-2xl transition-all shadow-[0_8px_24px_-8px_rgba(233,182,1,0.45)] active:scale-95"
          >
            Fechar Painel
          </button>
        </div>
      </div>
    </>
  );
}
