import { UserCheck, Heart, Briefcase } from 'lucide-react';
import { formatPhone } from '@/lib/utils';
import PremiumSelect from '@/components/ui/PremiumSelect';
import { STATUS_OPTIONS, ETAPA_OPTIONS, CANAL_OPTIONS } from '@/lib/leadConstants';

/**
 * Campos reutilizáveis do formulário de Lead (Identificação + Cônjuge + CRM).
 * Props:
 *  - form: objeto com os valores dos campos
 *  - onChange(field, value): callback de mudança
 *  - sellers: lista de vendedores [{id, nome}]
 *  - isVendedor: boolean
 *  - isAdm: boolean
 *  - userName: string (nome do vendedor logado, para readonly)
 */
export default function LeadFormFields({ form, onChange, sellers, isVendedor, isAdm, userName }) {
  return (
    <>
      {/* Seção 1: Identificação */}
      <div className="space-y-3">
        <h3 className="text-sky-600 font-black text-[9px] uppercase tracking-widest flex items-center gap-2 px-1">
          <UserCheck size={12} className="text-sky-400" /> Identificação do Lead
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 px-1 uppercase tracking-tighter">Nome *</label>
            <input type="text" placeholder="Nome..." className="premium-input h-9 px-4 text-sm" value={form.nome} onChange={e => onChange('nome', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 px-1 uppercase tracking-tighter">Sobrenome</label>
            <input type="text" placeholder="Sobrenome..." className="premium-input h-9 px-4 text-sm" value={form.sobrenome} onChange={e => onChange('sobrenome', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 px-1 uppercase tracking-tighter">Celular *</label>
            <input type="text" placeholder="(00) 00000-0000" className="premium-input h-9 px-4 text-sm" value={form.celular} onChange={e => onChange('celular', formatPhone(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 px-1 uppercase tracking-tighter">E-mail</label>
            <input type="email" placeholder="email@exemplo.com" className="premium-input h-9 px-4 text-sm" value={form.email} onChange={e => onChange('email', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 px-1 uppercase tracking-tighter">CEP *</label>
            <input type="text" placeholder="00000-000" className="premium-input h-9 px-4 text-sm" maxLength={9} value={form.cep} onChange={e => onChange('cep', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Seção 2: Cônjuge */}
      <div className="space-y-3">
        <h3 className="text-sky-600 font-black text-[9px] uppercase tracking-widest flex items-center gap-2 px-1">
          <Heart size={12} className="text-sky-400" /> Cônjuge (Opcional)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 px-1 uppercase tracking-tighter">Nome</label>
            <input type="text" placeholder="Nome do cônjuge..." className="premium-input h-9 px-4 text-sm" value={form.conjugeNome} onChange={e => onChange('conjugeNome', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 px-1 uppercase tracking-tighter">Sobrenome</label>
            <input type="text" placeholder="Sobrenome..." className="premium-input h-9 px-4 text-sm" value={form.conjugeSobrenome} onChange={e => onChange('conjugeSobrenome', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 px-1 uppercase tracking-tighter">Celular</label>
            <input type="text" placeholder="(00) 00000-0000" className="premium-input h-9 px-4 text-sm" value={form.conjugeCelular} onChange={e => onChange('conjugeCelular', formatPhone(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 px-1 uppercase tracking-tighter">E-mail</label>
            <input type="email" placeholder="email@exemplo.com" className="premium-input h-9 px-4 text-sm" value={form.conjugeEmail} onChange={e => onChange('conjugeEmail', e.target.value)} />
          </div>
          <div />
        </div>
      </div>

      {/* Seção 3: CRM & Atribuição */}
      <div className="space-y-3">
        <h3 className="text-sky-600 font-black text-[9px] uppercase tracking-widest flex items-center gap-2 px-1">
          <Briefcase size={12} className="text-sky-400" /> CRM & Atribuição
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 px-1 uppercase tracking-tighter">Status</label>
            <PremiumSelect options={STATUS_OPTIONS} value={form.status} onChange={e => onChange('status', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 px-1 uppercase tracking-tighter">Etapa da Jornada</label>
            <PremiumSelect placeholder="Selecione..." options={ETAPA_OPTIONS} value={form.etapa} onChange={e => onChange('etapa', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 px-1 uppercase tracking-tighter">Canal de Origem</label>
            <PremiumSelect placeholder="Selecione..." options={CANAL_OPTIONS} value={form.origemCanal} onChange={e => onChange('origemCanal', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 px-1 uppercase tracking-tighter">Pré-vendedor</label>
            {isVendedor && !isAdm ? (
              <input type="text" readOnly value={userName || ''} className="premium-input h-9 px-4 text-sm opacity-60 cursor-not-allowed" />
            ) : (
              <PremiumSelect placeholder="Selecione..." options={sellers} value={form.preVendedorId} onChange={e => onChange('preVendedorId', e.target.value)} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
