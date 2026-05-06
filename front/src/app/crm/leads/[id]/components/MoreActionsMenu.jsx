'use client';

import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, XCircle, RefreshCw, Trash2 } from 'lucide-react';

/**
 * Menu "⋯" do header — agrupa ações terciárias e destrutivas:
 *  - Cancelar Lead (terciária)
 *  - Reativar Lead (terciária — só quando isCancelado)
 *  - Excluir Lead (destrutiva, sempre por último, com cor danger)
 *
 * Padrão: dropdown leve com click-outside, sem dependência externa.
 */
export default function MoreActionsMenu({
  isCancelado,
  formDisabled,
  busy,
  onCancelLead,
  onReactivate,
  onDelete,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  const items = [];
  if (!isCancelado) {
    items.push({
      key: 'cancel',
      label: 'Cancelar Lead',
      icon: XCircle,
      onClick: () => { setOpen(false); onCancelLead(); },
      disabled: busy || formDisabled,
      tone: 'default',
    });
  }
  if (isCancelado) {
    items.push({
      key: 'reactivate',
      label: 'Reativar Lead',
      icon: RefreshCw,
      onClick: () => { setOpen(false); onReactivate(); },
      disabled: busy,
      tone: 'success',
    });
  }
  // Sempre por último, com divider visual
  items.push({
    key: 'delete',
    label: 'Excluir Lead',
    icon: Trash2,
    onClick: () => { setOpen(false); onDelete(); },
    disabled: busy,
    tone: 'danger',
    divider: true,
  });

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Mais ações"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className="p-2 rounded-2xl border border-(--border) text-(--text-muted) hover:bg-(--surface-3) hover:text-(--text-primary) transition-all"
      >
        <MoreHorizontal size={18} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 z-50 w-56 bg-(--surface-2) border border-(--border) rounded-2xl shadow-(--shadow-floating) overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right"
        >
          {items.map((item, idx) => {
            const Icon = item.icon;
            const toneClasses =
              item.tone === 'danger'
                ? 'text-(--danger) hover:bg-(--danger-soft)'
                : item.tone === 'success'
                  ? 'text-(--success) hover:bg-(--success-soft)'
                  : 'text-(--text-secondary) hover:bg-(--surface-3) hover:text-(--text-primary)';
            return (
              <div key={item.key}>
                {item.divider && idx > 0 && (
                  <div className="h-px bg-(--border-subtle) mx-2" />
                )}
                <button
                  role="menuitem"
                  type="button"
                  disabled={item.disabled}
                  onClick={item.onClick}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold tracking-tight transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${toneClasses}`}
                >
                  <Icon size={14} />
                  {item.label}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
