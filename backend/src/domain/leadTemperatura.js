/**
 * Enumeração canônica de Temperatura do Lead.
 *
 * Fonte de verdade: specs/crm.md §2 (Glossário) e §4.1 (invariantes)
 *
 * Temperatura é SEMPRE manual — não há cálculo automático nem origem externa.
 * Só pode ser definida via tela de edição do Lead, por usuário autenticado.
 *
 * 2026-05-07: ampliado de 3 para 4 valores. "Sem contato" virou estado default
 * explícito (substituindo null para leads não tocados); "Muito interessado" e
 * "Interessado" foram renomeados para a forma substantivada ("Muito interesse"
 * / "Pouco interesse") por consistência semântica com "Sem interesse".
 */

export const LeadTemperatura = Object.freeze({
  SEM_CONTATO: 'Sem contato',
  POUCO_INTERESSE: 'Pouco interesse',
  MUITO_INTERESSE: 'Muito interesse',
  SEM_INTERESSE: 'Sem interesse',
});

const ALL_TEMPERATURAS = Object.freeze(Object.values(LeadTemperatura));

export function getAllTemperaturas() {
  return ALL_TEMPERATURAS;
}

export function isValidTemperatura(value) {
  return ALL_TEMPERATURAS.includes(value);
}
