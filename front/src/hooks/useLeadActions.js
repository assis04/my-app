'use client';

import { useState, useCallback } from 'react';
import {
  transitionLeadStatus,
  setLeadTemperatura,
  cancelLead as cancelLeadApi,
  reactivateLead as reactivateLeadApi,
} from '@/services/crmApi';
import { friendlyErrorMessage } from '@/lib/apiError';

/**
 * Hook que orquestra as ações de lead (transição, temperatura, cancel, reactivate).
 *
 * Retorna:
 *  - transitionStatus({ status, motivo, contexto }): Promise<boolean> (true se sucesso)
 *  - setTemperatura(temperatura): Promise<boolean>
 *  - cancelLead(motivo): Promise<boolean>
 *  - reactivateLead({ modo, motivo }): Promise<Object | null> (retorna response pra redirect)
 *  - busy: boolean (true durante qualquer requisição)
 *  - error: string (mensagem user-friendly ou '')
 *  - success: string (mensagem de sucesso ou '')
 *  - clearFeedback(): limpa success/error
 *
 * @param {number|string} leadId
 * @param {() => void | Promise<void>} onSuccess - callback após sucesso (ex: recarregar lead)
 *
 * Plan: specs/crm-frontend-plan.md F6.1
 */
export function useLeadActions(leadId, onSuccess) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const clearFeedback = useCallback(() => {
    setError('');
    setSuccess('');
  }, []);

  const run = useCallback(
    async (fn, successMsg) => {
      setBusy(true);
      setError('');
      setSuccess('');
      try {
        const result = await fn();
        setSuccess(successMsg);
        if (onSuccess) await onSuccess(result);
        return result;
      } catch (err) {
        setError(friendlyErrorMessage(err));
        return null;
      } finally {
        setBusy(false);
      }
    },
    [onSuccess],
  );

  const transitionStatus = useCallback(
    async ({ status, motivo, contexto }) => {
      const res = await run(
        () => transitionLeadStatus(leadId, { status, motivo, contexto }),
        `Status alterado para "${status}".`,
      );
      return !!res;
    },
    [leadId, run],
  );

  const setTemperatura = useCallback(
    async (temperatura) => {
      const res = await run(
        () => setLeadTemperatura(leadId, temperatura),
        `Temperatura atualizada para "${temperatura}".`,
      );
      // Backend retorna changed:false se valor não mudou — silenciar sucesso redundante
      if (res && res.changed === false) setSuccess('');
      return !!res;
    },
    [leadId, run],
  );

  const cancelLead = useCallback(
    async (motivo) => {
      const res = await run(
        () => cancelLeadApi(leadId, motivo),
        'Lead cancelado com sucesso.',
      );
      return !!res;
    },
    [leadId, run],
  );

  const reactivateLead = useCallback(
    async ({ modo, motivo }) => {
      const res = await run(
        () => reactivateLeadApi(leadId, { modo, motivo }),
        modo === 'novo' ? 'Novo lead criado a partir do cancelamento.' : 'Lead reativado.',
      );
      return res; // Retorna o payload completo pra caller decidir redirect
    },
    [leadId, run],
  );

  return {
    transitionStatus,
    setTemperatura,
    cancelLead,
    reactivateLead,
    busy,
    error,
    success,
    clearFeedback,
  };
}
