import { useState, useCallback } from 'react';

/**
 * Hook para controlar estado de abertura/fechamento de modais.
 * Retorna [isOpen, open, close, toggle].
 */
export function useModal(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);
  return [isOpen, open, close, toggle];
}
