'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import { setLeadTemperatura } from '@/services/crmApi';
import { friendlyErrorMessage } from '@/lib/apiError';

/**
 * Dropdown compacto pra setar temperatura do Lead inline na listagem.
 *
 * Trigger é uma bolinha sólida 16px com a cor do estado atual — densidade
 * máxima, identifica o estado por cor pura. Click abre popover via Portal
 * com as 4 opções e labels completos (dot colorida + texto). Portal escapa
 * containing blocks criados por ancestrais com `backdrop-filter`/`transform`
 * (mesmo motivo pelo qual ModalBase usa Portal).
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
// Mapa cor→semântica:
//   Sem contato     → cinza   (neutro, ainda não interagido)
//   Pouco interesse → amarelo (gold, brand — interesse moderado)
//   Muito interesse → verde   (success — prioridade positiva)
//   Sem interesse   → vermelho (danger — terminal negativo)
// Trigger é uma bolinha sólida (sem ícone) pra densidade máxima na listagem.
// Workshop: dot concêntrico — anel externo + centro sólido.
// Detalhe técnico-mecânico que vira identidade visual sem ser ornamento.
const OPTIONS = [
  {
    value: 'Sem contato',
    ringColor: 'border-(--text-muted)',
    dotColor: 'bg-(--text-muted)',
  },
  {
    value: 'Pouco interesse',
    ringColor: 'border-(--gold)',
    dotColor: 'bg-(--gold)',
  },
  {
    value: 'Muito interesse',
    ringColor: 'border-(--success)',
    dotColor: 'bg-(--success)',
  },
  {
    value: 'Sem interesse',
    ringColor: 'border-(--danger)',
    dotColor: 'bg-(--danger)',
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
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`
          inline-flex items-center justify-center w-[18px] h-[18px] shrink-0 rounded-full border-2 align-middle box-border
          transition-shadow disabled:opacity-50 disabled:cursor-not-allowed
          hover:ring-2 hover:ring-(--gold)/30
          ${pending ? 'animate-pulse' : ''}
          ${error ? 'ring-2 ring-(--danger)/40' : ''}
          ${current.ringColor}
        `}
        style={{ transitionTimingFunction: 'var(--ease-spring)' }}
      >
        {/* Dot concêntrico interno — sinaliza estado mesmo em condições de baixo contraste. */}
        <span className={`w-[7px] h-[7px] rounded-full ${current.dotColor}`} aria-hidden />
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
          {OPTIONS.map(({ value: optValue, ringColor, dotColor }) => {
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
                  w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium tracking-tight
                  transition-colors text-left
                  ${isActive ? 'bg-(--surface-3) text-(--text-primary)' : 'text-(--text-secondary) hover:bg-(--surface-3) hover:text-(--text-primary)'}
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {/* Anel concêntrico — consistente com o trigger principal */}
                <span className={`inline-flex items-center justify-center w-[14px] h-[14px] shrink-0 rounded-full border-2 box-border ${ringColor}`} aria-hidden>
                  <span className={`w-[5px] h-[5px] rounded-full ${dotColor}`} />
                </span>
                <span className="flex-1 min-w-0 truncate">{optValue}</span>
                {isActive && <Check size={13} className="text-(--gold) shrink-0" aria-hidden />}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}
