/**
 * Converte um erro vindo do helper `services/api.js` em mensagem user-friendly.
 *
 * O helper rejeita com um Error que tem `.status` (HTTP) e `.message` (do backend).
 * Para compat com callers antigos, também aceita strings puras e objetos `{ message }`.
 *
 * Mapeamento:
 *  - 400 → mensagem do backend (já vem user-friendly via Zod)
 *  - 401 → tratado pelo próprio api.js (redirect /login), não deve chegar aqui
 *  - 403 → permissão
 *  - 404 → recurso removido
 *  - 409 → conflito (lock, versão obsoleta, estado inválido da state machine)
 *  - 422 → dados inválidos
 *  - 500+ → genérico servidor
 *  - undefined → genérico (provavelmente rede/offline)
 *
 * Spec: specs/crm-frontend-plan.md §2.6
 */
export function friendlyErrorMessage(error) {
  if (error == null) return 'Erro inesperado. Tente novamente.';

  // Suporte a strings (callers legacy) + Error objects + plain objects.
  const status = typeof error === 'object' ? error.status : undefined;
  const backendMsg =
    typeof error === 'string'
      ? error
      : (error?.message || (typeof error?.data === 'object' ? error.data?.message : null));

  if (status === 400) {
    return backendMsg || 'Dados inválidos. Revise os campos e tente novamente.';
  }
  if (status === 403) {
    return 'Você não tem permissão para esta ação.';
  }
  if (status === 404) {
    return 'Recurso não encontrado — pode ter sido removido.';
  }
  if (status === 409) {
    return backendMsg || 'Conflito de estado. Tente novamente em alguns segundos.';
  }
  if (status === 422) {
    return backendMsg || 'Dados inválidos.';
  }
  if (typeof status === 'number' && status >= 500) {
    return 'Erro interno do servidor. Tente novamente em instantes.';
  }

  // Sem status (rede, CORS, offline) ou status desconhecido.
  return backendMsg || 'Erro inesperado. Tente novamente.';
}
