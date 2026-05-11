'use client';

import { useState } from 'react';
import { Calendar, X } from 'lucide-react';

/**
 * Filtro de período: 3 atalhos rápidos (Hoje / 7d / 30d) + modo custom
 * com data inicial e final.
 *
 * Estado é controlado pelo pai. Shape do `value`:
 *   { modo: ''|'Hoje'|'7d'|'30d'|'custom', dataInicio?: 'YYYY-MM-DD', dataFim?: 'YYYY-MM-DD' }
 *
 * Validação: se modo='custom' e dataInicio > dataFim, mostra erro inline e
 * o pai pode descartar o filtro até corrigir (não envia request ruim).
 *
 * Props:
 *  - value: estado atual
 *  - onChange(next): callback com o novo estado
 *  - error: mensagem opcional (geralmente sobre validação fora do componente)
 */
export default function PeriodoFilter({ value = { modo: '' }, onChange, className = '' }) {
  const isCustom = value.modo === 'custom';
  const [open, setOpen] = useState(isCustom);

  const localError = computeError(value);

  const setPreset = (modo) => {
    setOpen(false);
    onChange({ modo });
  };

  const enterCustom = () => {
    setOpen(true);
    onChange({ modo: 'custom', dataInicio: value.dataInicio || '', dataFim: value.dataFim || '' });
  };

  const setRangePart = (key, val) => {
    onChange({ ...value, modo: 'custom', [key]: val });
  };

  const clearAll = () => {
    setOpen(false);
    onChange({ modo: '' });
  };

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <Chip active={!value.modo} onClick={() => setPreset('')}>
        Qualquer
      </Chip>
      <Chip active={value.modo === 'Hoje'} onClick={() => setPreset('Hoje')}>
        Hoje
      </Chip>
      <Chip active={value.modo === '7d'} onClick={() => setPreset('7d')}>
        7 dias
      </Chip>
      <Chip active={value.modo === '30d'} onClick={() => setPreset('30d')}>
        30 dias
      </Chip>
      <Chip active={isCustom} onClick={enterCustom} icon={Calendar}>
        Período…
      </Chip>

      {isCustom && open && (
        <div className="flex flex-wrap items-center gap-2 ml-1">
          <input
            type="date"
            value={value.dataInicio || ''}
            max={value.dataFim || undefined}
            onChange={(e) => setRangePart('dataInicio', e.target.value)}
            aria-label="Data inicial"
            className="bg-(--surface-2) text-(--text-primary) text-sm font-medium px-3 h-8 rounded-xl border border-(--border) focus:border-(--gold) focus:ring-2 focus:ring-(--gold-soft) outline-none transition-all tabular-nums"
            style={{ colorScheme: 'dark' }}
          />
          <span className="text-(--text-muted) text-sm">até</span>
          <input
            type="date"
            value={value.dataFim || ''}
            min={value.dataInicio || undefined}
            onChange={(e) => setRangePart('dataFim', e.target.value)}
            aria-label="Data final"
            className="bg-(--surface-2) text-(--text-primary) text-sm font-medium px-3 h-8 rounded-xl border border-(--border) focus:border-(--gold) focus:ring-2 focus:ring-(--gold-soft) outline-none transition-all tabular-nums"
            style={{ colorScheme: 'dark' }}
          />
          <button
            type="button"
            onClick={clearAll}
            aria-label="Limpar período"
            className="p-1.5 text-(--text-muted) hover:text-(--danger) hover:bg-(--danger-soft) rounded-lg transition-colors"
          >
            <X size={13} />
          </button>
          {localError && (
            <span className="text-xs text-(--danger) font-medium">{localError}</span>
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, children, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`
        inline-flex items-center gap-1.5 h-8 px-3 rounded-full whitespace-nowrap
        text-sm font-medium tracking-tight transition-all
        ${active
          ? 'bg-(--surface-3) text-(--text-primary) border border-(--border) shadow-xs'
          : 'text-(--text-muted) border border-transparent hover:text-(--text-primary) hover:bg-(--surface-2)'}
      `}
    >
      {Icon && <Icon size={12} />}
      {children}
    </button>
  );
}

function computeError(value) {
  if (value.modo !== 'custom') return null;
  if (!value.dataInicio || !value.dataFim) return null;
  if (new Date(value.dataInicio) > new Date(value.dataFim)) {
    return 'Início > fim';
  }
  return null;
}

/**
 * Helper exportável pra page consumer: dada o `value`, devolve { dataInicio,
 * dataFim } em ISO (com fronteira do dia local) prontos pro backend, OU null
 * se o filtro não deve ser aplicado (sem modo, ou validação falhou).
 *
 * Datas são montadas no fuso do browser; o backend depois normaliza
 * via parseDateBoundary se necessário.
 */
export function buildPeriodoQuery(value) {
  if (!value || !value.modo) return null;
  if (computeError(value)) return null;

  const now = new Date();

  if (value.modo === 'Hoje') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return { dataInicio: start.toISOString() };
  }
  if (value.modo === '7d') {
    const start = new Date();
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    return { dataInicio: start.toISOString() };
  }
  if (value.modo === '30d') {
    const start = new Date();
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
    return { dataInicio: start.toISOString() };
  }
  if (value.modo === 'custom') {
    const out = {};
    if (value.dataInicio) {
      const start = new Date(`${value.dataInicio}T00:00:00`);
      out.dataInicio = start.toISOString();
    }
    if (value.dataFim) {
      const end = new Date(`${value.dataFim}T23:59:59.999`);
      out.dataFim = end.toISOString();
    }
    return Object.keys(out).length ? out : null;
  }

  return null;
}
