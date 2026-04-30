import { UserCheck, Heart, Briefcase } from 'lucide-react';
import { formatPhone } from '@/lib/utils';
import PremiumSelect from '@/components/ui/PremiumSelect';
import { CANAL_OPTIONS } from '@/lib/leadConstants';

/**
 * Campos editáveis do formulário de Lead (Identificação + Cônjuge + Canal/Pré-vendedor).
 *
 * Status e Etapa NÃO são editáveis aqui — status transiciona via endpoint dedicado
 * (LeadStatusDropdown → /leads/:id/status) e etapa é derivada do status no backend.
 *
 * Props:
 *  - form: objeto com os valores dos campos
 *  - onChange(field, value): callback de mudança
 *  - sellers: lista de vendedores [{id, nome}]
 *  - isVendedor: boolean
 *  - isAdm: boolean
 *  - userName: string (nome do vendedor logado, para readonly)
 *  - disabled: boolean — se true, todos os inputs ficam read-only (ex: pós-venda sem permissão)
 */
export default function LeadFormFields({ form, onChange, sellers, isVendedor, isAdm, userName, disabled = false }) {
  return (
    <>
      {/* Seção 1: Identificação */}
      <div className="space-y-3">
        <h3 className="text-sky-600 font-black text-sm tracking-tight flex items-center gap-2 px-1">
          <UserCheck size={12} className="text-sky-400" /> Identificação do Lead
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-black text-slate-400 px-1 tracking-tight">Nome *</label>
            <input type="text" placeholder="Nome..." className="premium-input h-9 px-4 text-base" value={form.nome} onChange={e => onChange('nome', e.target.value)} disabled={disabled} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-black text-slate-400 px-1 tracking-tight">Sobrenome</label>
            <input type="text" placeholder="Sobrenome..." className="premium-input h-9 px-4 text-base" value={form.sobrenome} onChange={e => onChange('sobrenome', e.target.value)} disabled={disabled} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-black text-slate-400 px-1 tracking-tight">Celular *</label>
            <input type="text" placeholder="(00) 00000-0000" className="premium-input h-9 px-4 text-base" value={form.celular} onChange={e => onChange('celular', formatPhone(e.target.value))} disabled={disabled} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-black text-slate-400 px-1 tracking-tight">E-mail</label>
            <input type="email" placeholder="email@exemplo.com" className="premium-input h-9 px-4 text-base" value={form.email} onChange={e => onChange('email', e.target.value)} disabled={disabled} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-black text-slate-400 px-1 tracking-tight">CEP *</label>
            <input type="text" placeholder="00000-000" className="premium-input h-9 px-4 text-base" maxLength={9} value={form.cep} onChange={e => onChange('cep', e.target.value)} disabled={disabled} />
          </div>
        </div>
      </div>

      {/* Seção 2: Cônjuge */}
      <div className="space-y-3">
        <h3 className="text-sky-600 font-black text-sm tracking-tight flex items-center gap-2 px-1">
          <Heart size={12} className="text-sky-400" /> Cônjuge (Opcional)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-black text-slate-400 px-1 tracking-tight">Nome</label>
            <input type="text" placeholder="Nome do cônjuge..." className="premium-input h-9 px-4 text-base" value={form.conjugeNome} onChange={e => onChange('conjugeNome', e.target.value)} disabled={disabled} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-black text-slate-400 px-1 tracking-tight">Sobrenome</label>
            <input type="text" placeholder="Sobrenome..." className="premium-input h-9 px-4 text-base" value={form.conjugeSobrenome} onChange={e => onChange('conjugeSobrenome', e.target.value)} disabled={disabled} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-black text-slate-400 px-1 tracking-tight">Celular</label>
            <input type="text" placeholder="(00) 00000-0000" className="premium-input h-9 px-4 text-base" value={form.conjugeCelular} onChange={e => onChange('conjugeCelular', formatPhone(e.target.value))} disabled={disabled} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-black text-slate-400 px-1 tracking-tight">E-mail</label>
            <input type="email" placeholder="email@exemplo.com" className="premium-input h-9 px-4 text-base" value={form.conjugeEmail} onChange={e => onChange('conjugeEmail', e.target.value)} disabled={disabled} />
          </div>
          <div />
        </div>
      </div>

      {/* Seção 3: Atribuição */}
      <div className="space-y-3">
        <h3 className="text-sky-600 font-black text-sm tracking-tight flex items-center gap-2 px-1">
          <Briefcase size={12} className="text-sky-400" /> Atribuição
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-black text-slate-400 px-1 tracking-tight">Canal de Origem</label>
            <PremiumSelect placeholder="Selecione..." options={CANAL_OPTIONS} value={form.origemCanal} onChange={e => onChange('origemCanal', e.target.value)} disabled={disabled} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-black text-slate-400 px-1 tracking-tight">Pré-vendedor</label>
            {isVendedor && !isAdm ? (
              <input type="text" readOnly value={userName || ''} className="premium-input h-9 px-4 text-base opacity-60 cursor-not-allowed" />
            ) : (
              <PremiumSelect placeholder="Selecione..." options={sellers} value={form.preVendedorId} onChange={e => onChange('preVendedorId', e.target.value)} disabled={disabled} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
