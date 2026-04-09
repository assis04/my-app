import { useState, useEffect } from 'react';

/**
 * Retorna o valor com delay (debounce).
 * Ideal para searchTerm — evita chamadas API a cada tecla.
 */
export function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
