'use client';

import { useEffect, useCallback, useId } from 'react';
import { X } from 'lucide-react';

/**
 * Modal base com overlay padronizado.
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - title: string
 *  - subtitle: string (opcional)
 *  - maxWidth: string (default 'max-w-lg')
 *  - children: conteúdo do body
 *  - footer: conteúdo do footer (opcional)
 */
export default function ModalBase({ open, onClose, title, subtitle, maxWidth = 'max-w-lg', children, footer }) {
  const titleId = useId();
  const subtitleId = useId();

  const handleEsc = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [open, handleEsc]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`bg-(--surface-2) rounded-3xl shadow-(--shadow-floating) w-full ${maxWidth} max-h-[90vh] flex flex-col border border-(--border-subtle) animate-in fade-in zoom-in-95 duration-200`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-(--border-subtle) shrink-0">
          <div>
            <h2 id={titleId} className="text-lg font-black text-(--text-primary) tracking-tight">{title}</h2>
            {subtitle && <p id={subtitleId} className="text-xs text-(--text-muted) font-bold mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar modal"
            className="p-2 hover:bg-(--surface-3) rounded-xl text-(--text-muted) hover:text-(--text-primary) transition-all"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex gap-3 p-6 pt-4 border-t border-(--border-subtle) shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
