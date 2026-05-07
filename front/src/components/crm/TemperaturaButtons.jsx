'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  CircleDashed,
  ThermometerSun,
  Flame,
  Snowflake,
  Loader2,
  Check,
} from 'lucide-react';
import { setLeadTemperatura } from '@/services/crmApi';
import { friendlyErrorMessage } from '@/lib/apiError';

/**
 * Dropdown compacto pra setar temperatura do Lead inline na listagem.
 *
 * Trigger circular 28px (icon-only com cor do estado atual) — preserva a
 * densidade visual original dos 3 botões. Click abre popover via Portal
 * com as 4 opções e labels completos. Portal escapa containing blocks
 * criados por ancestrais com `backdrop-filter`/`transform` (mesmo motivo
 * pelo qual ModalBase usa Portal).
 *
 * Valores canônicos (espelham backend/src/domain/leadTemperatura.js):
 *  - 'Sem contato'      (default, ainda não houve interação)
 *  - 'Pouco interesse'  (morno)
 *  - 'Muito interesse'  (quente, prioridade)
 *  - 'Sem interesse'    (terminal negativo)
 *
 * Props:
 *  - leadId: number — alvo do PUT /api/crm/leads/:id/temperatura
 *  - value: string|null — temperatura atual (null tratado como 'Sem contato' visual,
 *           mas seleção sempre grava o valor explícito)
 *  - onChange(updatedLead): callback APÓS sucesso, com o lead atualizado
 *  - disabled: boolean — bloqueia interação (ex: lead em status terminal sem permissão)
 */
const OPTIONS = [
  {
    value: 'Sem contato',
    Icon: CircleDashed,
    triggerActive: 'bg-(--surface-3) text-(--text-muted) border-(--border)',
    iconClass: 'text-(--text-muted)',
  },
  {
    value: 'Pouco interesse',
    Icon: ThermometerSun,
    triggerActive: 'bg-(--gold-soft) text-(--gold) border-(--gold)/40',
    iconClass: 'text-(--gold)',
  },
  {
    value: 'Muito interesse',
    Icon: Flame,
    triggerActive: 'bg-(--gold) text-(--on-gold) border-(--gold-hover) shadow-[0_0_0_2px_rgba(233,182,1,0.25)]',
    iconClass: 'text-(--on-gold)',
  },
  {
    value: 'Sem interesse',
    Icon: Snowflake,
    triggerActive: 'bg-(--danger-soft) text-(--danger) border-(--danger)/40',
    iconClass: 'text-(--danger)',
  },
];

function findOption(value) {
  return OPTIONS.find((o) => o.value === value) || null;
}

export default function TemperaturaButtons({ leadId, value, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const [coords, setCoords] = useState(null);

  // Trata null como "Sem contato" visualmente (durante transição/migração de dados)
  const displayValue = value || 'Sem contato';
  const current = findOption(displayValue);

  // Calcula posição do popover relativa ao trigger (Portal → coordenadas viewport).
  // Trigger é round 28px; popover abre alinhado à esquerda do trigger pra baixo,
  // com clamp pra não sair da viewport.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const POPOVER_WIDTH = 180;
    const VIEWPORT_PADDING = 8;
    const left = Math.min(
      Math.max(VIEWPORT_PADDING, rect.left),
      window.innerWidth - POPOVER_WIDTH - VIEWPORT_PADDING,
    );
    setCoords({ top: rect.bottom + 6, left });
  }, [open]);

  // Click fora / ESC fecham o popover
  useEffect(() => {
    if (!open) return;

    const handleClick = (e) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const handleSelect = async (newValue) => {
    if (disabled || pending) return;

    if (newValue === value) {
      setOpen(false);
      return;
    }

    setPending(true);
    setError(null);

    try {
      const result = await setLeadTemperatura(leadId, newValue);
      if (result?.changed && result.lead) {
        onChange?.(result.lead);
      } else if (!result?.changed) {
        onChange?.({ ...result?.lead, temperatura: newValue });
      }
      setOpen(false);
    } catch (err) {
      setError(friendlyErrorMessage(err) || 'Erro ao atualizar.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setPending(false);
    }
  };

  const TriggerIcon = current?.Icon || CircleDashed;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Temperatura: ${displayValue}`}
        title={error || displayValue}
        disabled={disabled || pending}
        onClick={(e) => {
          e.stopPropagation(); // row tem onClick de navegação
          setOpen((v) => !v);
        }}
        className={`
          inline-flex items-center justify-center w-7 h-7 rounded-full border
          transition-all disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'ring-2 ring-(--danger)/40' : ''}
          ${current.triggerActive}
        `}
      >
        {pending
          ? <Loader2 size={12} className="animate-spin" />
          : <TriggerIcon size={13} />
        }
      </button>

      {open && coords && createPortal(
        <div
          ref={popoverRef}
          role="listbox"
          aria-label="Selecionar temperatura"
          className="fixed z-50 w-[180px] rounded-xl border border-(--border) bg-(--surface-2) shadow-2xl py-1 animate-in fade-in zoom-in-95 duration-150 origin-top-left"
          style={{ top: coords.top, left: coords.left }}
          onClick={(e) => e.stopPropagation()}
        >
          {OPTIONS.map(({ value: optValue, Icon, iconClass }) => {
            const isActive = displayValue === optValue;
            return (
              <button
                key={optValue}
                type="button"
                role="option"
                aria-selected={isActive}
                disabled={pending}
                onClick={() => handleSelect(optValue)}
                className={`
                  w-full flex items-center gap-2.5 px-3 py-2 text-sm font-bold tracking-tight
                  transition-colors text-left
                  ${isActive ? 'bg-(--surface-3) text-(--text-primary)' : 'text-(--text-secondary) hover:bg-(--surface-3) hover:text-(--text-primary)'}
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <Icon size={14} className={iconClass} aria-hidden />
                <span className="flex-1">{optValue}</span>
                {isActive && <Check size={13} className="text-(--gold)" aria-hidden />}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}
