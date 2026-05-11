import { UserCheck, Heart, Briefcase, AlertCircle } from 'lucide-react';
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
 *  - onBlur(field): callback opcional para validar o campo no blur
 *  - errors: map { field: 'mensagem' } de erros por campo (opcional)
 *  - sellers: lista de vendedores [{id, nome}]
 *  - isVendedor: boolean
 *  - isAdm: boolean
 *  - userName: string (nome do vendedor logado, para readonly)
 *  - disabled: boolean — se true, todos os inputs ficam read-only (ex: pós-venda sem permissão)
 */

function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-xs font-bold text-(--danger) mt-1 px-1 animate-in slide-in-from-top-1 duration-150">
      <AlertCircle size={11} />
      {message}
    </p>
  );
}

function inputClass(hasError, baseHeight = 'h-9') {
  return [
    'premium-input',
    baseHeight,
    'px-4 text-base',
    hasError ? 'border-(--danger) focus:border-(--danger) focus:ring-(--danger-soft) ring-2 ring-(--danger)/20' : '',
  ].filter(Boolean).join(' ');
}

export default function LeadFormFields({
  form,
  onChange,
  onBlur,
  errors = {},
  sellers,
  isVendedor,
  isAdm,
  userName,
  disabled = false,
}) {
  const handleBlur = (field) => () => onBlur?.(field);

  return (
    <>
      {/* Seção 1: Identificação */}
      <div className="space-y-3">
        <h3 className="text-(--gold) font-semibold text-sm tracking-tight flex items-center gap-2 px-1">
          <UserCheck size={12} className="text-(--gold)" /> Identificação do Lead
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="lead-nome" className="text-sm font-medium text-(--text-muted) px-1 tracking-tight">Nome *</label>
            <input
              id="lead-nome"
              data-field="nome"
              type="text"
              placeholder="Nome..."
              className={inputClass(errors.nome)}
              value={form.nome}
              onChange={e => onChange('nome', e.target.value)}
              onBlur={handleBlur('nome')}
              disabled={disabled}
              aria-invalid={!!errors.nome}
              aria-describedby={errors.nome ? 'lead-nome-error' : undefined}
            />
            <FieldError message={errors.nome} />
          </div>
          <div className="space-y-1">
            <label htmlFor="lead-sobrenome" className="text-sm font-medium text-(--text-muted) px-1 tracking-tight">Sobrenome</label>
            <input
              id="lead-sobrenome"
              type="text"
              placeholder="Sobrenome..."
              className={inputClass(false)}
              value={form.sobrenome}
              onChange={e => onChange('sobrenome', e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label htmlFor="lead-celular" className="text-sm font-medium text-(--text-muted) px-1 tracking-tight">Celular *</label>
            <input
              id="lead-celular"
              data-field="celular"
              type="text"
              placeholder="(00) 00000-0000"
              className={inputClass(errors.celular)}
              value={form.celular}
              onChange={e => onChange('celular', formatPhone(e.target.value))}
              onBlur={handleBlur('celular')}
              disabled={disabled}
              aria-invalid={!!errors.celular}
            />
            <FieldError message={errors.celular} />
          </div>
          <div className="space-y-1">
            <label htmlFor="lead-email" className="text-sm font-medium text-(--text-muted) px-1 tracking-tight">E-mail</label>
            <input
              id="lead-email"
              data-field="email"
              type="email"
              placeholder="email@exemplo.com"
              className={inputClass(errors.email)}
              value={form.email}
              onChange={e => onChange('email', e.target.value)}
              onBlur={handleBlur('email')}
              disabled={disabled}
              aria-invalid={!!errors.email}
            />
            <FieldError message={errors.email} />
          </div>
          <div className="space-y-1">
            <label htmlFor="lead-cep" className="text-sm font-medium text-(--text-muted) px-1 tracking-tight">CEP *</label>
            <input
              id="lead-cep"
              data-field="cep"
              type="text"
              placeholder="00000-000"
              className={inputClass(errors.cep)}
              maxLength={9}
              value={form.cep}
              onChange={e => onChange('cep', e.target.value)}
              onBlur={handleBlur('cep')}
              disabled={disabled}
              aria-invalid={!!errors.cep}
            />
            <FieldError message={errors.cep} />
          </div>
        </div>
      </div>

      {/* Seção 2: Cônjuge */}
      <div className="space-y-3">
        <h3 className="text-(--gold) font-semibold text-sm tracking-tight flex items-center gap-2 px-1">
          <Heart size={12} className="text-(--gold)" /> Cônjuge (Opcional)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="lead-conjuge-nome" className="text-sm font-medium text-(--text-muted) px-1 tracking-tight">Nome</label>
            <input
              id="lead-conjuge-nome"
              type="text"
              placeholder="Nome do cônjuge..."
              className={inputClass(false)}
              value={form.conjugeNome}
              onChange={e => onChange('conjugeNome', e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="lead-conjuge-sobrenome" className="text-sm font-medium text-(--text-muted) px-1 tracking-tight">Sobrenome</label>
            <input
              id="lead-conjuge-sobrenome"
              type="text"
              placeholder="Sobrenome..."
              className={inputClass(false)}
              value={form.conjugeSobrenome}
              onChange={e => onChange('conjugeSobrenome', e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label htmlFor="lead-conjuge-celular" className="text-sm font-medium text-(--text-muted) px-1 tracking-tight">Celular</label>
            <input
              id="lead-conjuge-celular"
              type="text"
              placeholder="(00) 00000-0000"
              className={inputClass(false)}
              value={form.conjugeCelular}
              onChange={e => onChange('conjugeCelular', formatPhone(e.target.value))}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="lead-conjuge-email" className="text-sm font-medium text-(--text-muted) px-1 tracking-tight">E-mail</label>
            <input
              id="lead-conjuge-email"
              data-field="conjugeEmail"
              type="email"
              placeholder="email@exemplo.com"
              className={inputClass(errors.conjugeEmail)}
              value={form.conjugeEmail}
              onChange={e => onChange('conjugeEmail', e.target.value)}
              onBlur={handleBlur('conjugeEmail')}
              disabled={disabled}
              aria-invalid={!!errors.conjugeEmail}
            />
            <FieldError message={errors.conjugeEmail} />
          </div>
          <div />
        </div>
      </div>

      {/* Seção 3: Atribuição */}
      <div className="space-y-3">
        <h3 className="text-(--gold) font-semibold text-sm tracking-tight flex items-center gap-2 px-1">
          <Briefcase size={12} className="text-(--gold)" /> Atribuição
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-(--text-muted) px-1 tracking-tight">Canal de Origem</label>
            <PremiumSelect placeholder="Selecione..." options={CANAL_OPTIONS} value={form.origemCanal} onChange={e => onChange('origemCanal', e.target.value)} disabled={disabled} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-(--text-muted) px-1 tracking-tight">Pré-vendedor</label>
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
