'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';
import { useId, useState } from 'react';

/**
 * Diálogo de confirmação visual (substitui window.confirm / window.alert).
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - onConfirm: async () => void  (pode ser async — mostra spinner)
 *  - title: string
 *  - message: string
 *  - confirmLabel: string (default "Confirmar")
 *  - cancelLabel: string (default "Cancelar")
 *  - variant: 'danger' | 'warning' | 'info' (default 'danger')
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirmar ação',
  message = 'Tem certeza que deseja continuar?',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
}) {
  const [loading, setLoading] = useState(false);
  const titleId = useId();
  const messageId = useId();

  if (!open) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      onClose();
    }
  };

  const variantStyles = {
    danger: {
      icon: 'bg-(--danger-soft) text-(--danger) border border-(--danger)/40',
      button: 'bg-transparent text-(--danger) border border-(--danger) hover:bg-(--danger-soft)',
    },
    warning: {
      icon: 'bg-(--gold-soft) text-(--gold) border border-(--gold)/40',
      button: 'bg-(--gold) text-(--on-gold) hover:bg-(--gold-hover)',
    },
    info: {
      icon: 'bg-(--gold-soft) text-(--gold) border border-(--gold)/40',
      button: 'bg-(--gold) text-(--on-gold) hover:bg-(--gold-hover)',
    },
  };

  const styles = variantStyles[variant] || variantStyles.danger;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-(--surface-2) rounded-3xl shadow-(--shadow-floating) w-full max-w-sm border border-(--border) animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
      >
        <div className="p-6 text-center">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${styles.icon}`}>
            <AlertTriangle size={22} aria-hidden="true" />
          </div>
          <h3 id={titleId} className="text-base font-black text-(--text-primary) tracking-tight mb-2">{title}</h3>
          <p id={messageId} className="text-sm text-(--text-secondary) font-medium leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 font-black text-xs text-(--text-muted) border border-(--border) rounded-2xl hover:bg-(--surface-3) hover:text-(--text-primary) transition-all active:scale-95 tracking-tight disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 font-black text-xs rounded-2xl transition-all active:scale-95 tracking-tight disabled:opacity-50 flex items-center justify-center gap-2 ${styles.button}`}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
