import { useState, useCallback } from 'react';

/**
 * Hook para gerenciar estado do ConfirmDialog.
 *
 * Uso:
 *   const { confirmProps, confirm } = useConfirm();
 *
 *   // Abrir diálogo
 *   confirm({
 *     title: 'Remover Lead',
 *     message: 'Tem certeza?',
 *     onConfirm: async () => { await deleteLead(id); },
 *     variant: 'danger',
 *   });
 *
 *   // No JSX
 *   <ConfirmDialog {...confirmProps} />
 */
export function useConfirm() {
  const [state, setState] = useState({
    open: false,
    title: '',
    message: '',
    confirmLabel: 'Confirmar',
    cancelLabel: 'Cancelar',
    variant: 'danger',
    onConfirm: () => {},
  });

  const confirm = useCallback((opts) => {
    setState({
      open: true,
      title: opts.title || 'Confirmar ação',
      message: opts.message || 'Tem certeza que deseja continuar?',
      confirmLabel: opts.confirmLabel || 'Confirmar',
      cancelLabel: opts.cancelLabel || 'Cancelar',
      variant: opts.variant || 'danger',
      onConfirm: opts.onConfirm || (() => {}),
    });
  }, []);

  const close = useCallback(() => {
    setState(prev => ({ ...prev, open: false }));
  }, []);

  return {
    confirm,
    confirmProps: {
      ...state,
      onClose: close,
    },
  };
}
