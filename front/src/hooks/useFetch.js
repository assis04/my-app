import { useState, useEffect, useCallback } from 'react';

/**
 * Hook genérico para fetch de dados com loading/error state.
 * Evita duplicação do padrão setLoading→try→fetch→catch→finally em todas as páginas.
 *
 * @param {Function} fetchFn  — função async que retorna os dados
 * @param {Object}   options  — { enabled: boolean (default true) }
 * @returns {{ data, loading, error, refetch }}
 */
export function useFetch(fetchFn, { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err?.message || err || 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    if (enabled) refetch();
  }, [enabled, refetch]);

  return { data, loading, error, refetch };
}
