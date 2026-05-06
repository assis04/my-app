'use client';

import { useState } from 'react';
import { Flame, ThermometerSun, Snowflake, Loader2 } from 'lucide-react';
import { setLeadTemperatura } from '@/services/crmApi';
import { friendlyErrorMessage } from '@/lib/apiError';

/**
 * Versão compacta inline do picker de temperatura — pra uso em cada linha
 * da listagem de Leads, antes do ID. 3 botões circulares (~28px).
 *
 * Diferente do TemperaturaPicker (chips horizontais com label visível,
 * usado em forms de detalhe), este é otimizado pra densidade de tabela:
 *  - sem labels visíveis (tooltip via title= e aria-label)
 *  - cor + ícone (Flame/Sun/Snowflake) — acessível pra daltonismo
 *  - state local de pending por linha (não bloqueia a tabela inteira)
 *  - idempotente no client (clicar no já-ativo é no-op, sem request)
 *
 * Valores de banco mantidos: 'Muito interessado' | 'Interessado' | 'Sem interesse'.
 *
 * Props:
 *  - leadId: number — id do lead pra disparar PUT /api/crm/leads/:id/temperatura
 *  - value: string|null — temperatura atual ('Muito interessado' | 'Interessado' | 'Sem interesse')
 *  - onChange(updatedLead): callback chamado APÓS sucesso com o lead atualizado
 *                          (para o caller manter sua source-of-truth sincronizada)
 *  - disabled: boolean — bloqueia interação (ex: lead em status terminal sem permissão)
 */
const OPTIONS = [
  {
    value: 'Muito interessado',
    label: 'Lead aquecido',
    Icon: Flame,
    activeClasses: 'bg-(--danger) text-white border-(--danger) shadow-[0_0_0_2px_rgba(226,109,92,0.25)]',
    idleClasses: 'bg-transparent text-(--danger)/60 border-(--border-subtle) hover:border-(--danger) hover:text-(--danger)',
  },
  {
    value: 'Interessado',
    label: 'Pouco interesse',
    Icon: ThermometerSun,
    activeClasses: 'bg-(--gold) text-(--on-gold) border-(--gold) shadow-[0_0_0_2px_rgba(233,182,1,0.25)]',
    idleClasses: 'bg-transparent text-(--gold)/60 border-(--border-subtle) hover:border-(--gold) hover:text-(--gold)',
  },
  {
    value: 'Sem interesse',
    label: 'Sem interesse',
    Icon: Snowflake,
    activeClasses: 'bg-(--surface-4) text-(--text-primary) border-(--border) shadow-[0_0_0_2px_rgba(74,64,54,0.4)]',
    idleClasses: 'bg-transparent text-(--text-faint) border-(--border-subtle) hover:border-(--text-muted) hover:text-(--text-muted)',
  },
];

export default function TemperaturaButtons({ leadId, value, onChange, disabled = false }) {
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null);

  const handleClick = async (newValue) => {
    if (disabled || pending) return;
    if (newValue === value) return; // idempotente — não dispara request

    setPending(newValue);
    setError(null);

    try {
      const result = await setLeadTemperatura(leadId, newValue);
      if (result?.changed && result.lead) {
        onChange?.(result.lead);
      } else if (!result?.changed) {
        // Backend disse "não mudou" — ainda assim repassa pro caller alinhar UI
        onChange?.({ ...result?.lead, temperatura: newValue });
      }
    } catch (err) {
      setError(friendlyErrorMessage(err) || 'Erro ao atualizar.');
      // Erro some sozinho após 3s — sem persistência no DOM
      setTimeout(() => setError(null), 3000);
    } finally {
      setPending(null);
    }
  };

  return (
    <div
      className="inline-flex items-center gap-1"
      role="radiogroup"
      aria-label="Temperatura do lead"
      title={error || undefined}
    >
      {OPTIONS.map(({ value: optValue, label, Icon, activeClasses, idleClasses }) => {
        const isActive = value === optValue;
        const isPending = pending === optValue;

        return (
          <button
            key={optValue}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={label}
            title={label}
            disabled={disabled || pending !== null}
            onClick={(e) => {
              e.stopPropagation(); // crítico — row tem onClick navegação
              handleClick(optValue);
            }}
            className={`
              inline-flex items-center justify-center w-7 h-7 rounded-full border transition-all
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? 'ring-2 ring-(--danger)/40' : ''}
              ${isActive ? activeClasses : idleClasses}
            `}
          >
            {isPending
              ? <Loader2 size={12} className="animate-spin" />
              : <Icon size={12} />
            }
          </button>
        );
      })}
    </div>
  );
}
