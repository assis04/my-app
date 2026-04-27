'use client';

import { Flame, ThermometerSun, Snowflake } from 'lucide-react';

const OPTIONS = [
  {
    value: 'Muito interessado',
    label: 'Muito interessado',
    Icon: Flame,
    activeClasses: 'bg-rose-500 text-white border-rose-500 shadow-rose-500/30',
    idleClasses: 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100',
  },
  {
    value: 'Interessado',
    label: 'Interessado',
    Icon: ThermometerSun,
    activeClasses: 'bg-amber-500 text-white border-amber-500 shadow-amber-500/30',
    idleClasses: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
  },
  {
    value: 'Sem interesse',
    label: 'Sem interesse',
    Icon: Snowflake,
    activeClasses: 'bg-sky-500 text-white border-sky-500 shadow-sky-500/30',
    idleClasses: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100',
  },
];

/**
 * Chip picker para os 3 valores canônicos de temperatura.
 *
 * Props:
 *  - value: 'Muito interessado' | 'Interessado' | 'Sem interesse' | null
 *  - onSelect: (newValue) => void — chamado ao clicar chip
 *  - disabled: boolean — desativa interação (ex: pós-venda sem permissão)
 *
 * Spec: specs/crm.md §4.5 | Plan: specs/crm-frontend-plan.md F4.1
 */
export default function TemperaturaPicker({ value, onSelect, disabled = false }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Temperatura do lead">
      {OPTIONS.map(({ value: optValue, label, Icon, activeClasses, idleClasses }) => {
        const active = value === optValue;
        return (
          <button
            type="button"
            key={optValue}
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => !disabled && !active && onSelect(optValue)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold border transition-all active:scale-95 shadow-sm uppercase tracking-tighter disabled:opacity-50 disabled:cursor-not-allowed ${
              active ? `${activeClasses} shadow-lg` : idleClasses
            }`}
          >
            <Icon size={13} aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
