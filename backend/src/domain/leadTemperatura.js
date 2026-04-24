/**
 * Enumeração canônica de Temperatura do Lead.
 *
 * Fonte de verdade: specs/crm.md §2 (Glossário) e §4.1 (invariantes)
 *
 * Temperatura é SEMPRE manual — não há cálculo automático nem origem externa.
 * Só pode ser definida via tela de edição do Lead, por usuário autenticado.
 */

export const LeadTemperatura = Object.freeze({
  MUITO_INTERESSADO: 'Muito interessado',
  INTERESSADO: 'Interessado',
  SEM_INTERESSE: 'Sem interesse',
});

const ALL_TEMPERATURAS = Object.freeze(Object.values(LeadTemperatura));

export function getAllTemperaturas() {
  return ALL_TEMPERATURAS;
}

export function isValidTemperatura(value) {
  return ALL_TEMPERATURAS.includes(value);
}
