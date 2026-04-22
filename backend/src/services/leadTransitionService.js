/**
 * leadTransitionService — orquestrador transacional de mudanças de status do Lead.
 *
 * Fonte de verdade: specs/crm.md §7 / specs/crm-plan.md §2.2
 *
 * Responsabilidade: aplicar uma transição de status aprovada pela statusMachine,
 * mantendo TODO o estado consistente em uma única transação:
 *   - SELECT ... FOR UPDATE no Lead (evita race entre transições concorrentes)
 *   - Lead.status + Lead.etapa (derivada via STATUS_TO_ETAPA)
 *   - Campos de cancelamento (statusAntesCancelamento + canceladoEm) quando aplicável
 *   - KanbanCard.coluna + posicao (movido pro fim da nova coluna)
 *   - LeadHistory (status_changed sempre; lead_cancelled e agenda_scheduled conforme side-effects)
 *
 * O que NÃO é feito aqui (ficam em tasks seguintes):
 *   - Integrações externas (Agenda real / N.O.N.) — via outbox, Task #15
 *   - Reativação de Lead cancelado — serviço separado (Task #12), não passa por validateTransition
 */

import prisma from '../config/prisma.js';
import AppError from '../utils/AppError.js';
import {
  validateTransition,
  getSideEffects,
  SideEffectType,
} from './statusMachine.js';
import {
  getEtapaForStatus,
  requiresAdminToEdit,
  LeadStatus,
} from '../domain/leadStatus.js';
import { LeadEventType } from '../domain/leadEvents.js';
import { add as addHistoryEvent } from './leadHistoryService.js';

function isAdm(user) {
  return user?.role === 'ADM' || user?.permissions?.includes('*');
}

function hasPermission(user, perm) {
  return Array.isArray(user?.permissions) && user.permissions.includes(perm);
}

function assertFilialAccess(lead, user) {
  if (isAdm(user)) return;
  if (user?.filialId && lead.filialId && lead.filialId !== user.filialId) {
    throw new AppError('Acesso negado: lead de outra filial.', 403);
  }
}

/**
 * Calcula a próxima posição dentro de uma coluna do Kanban.
 * Mantém ordenação estável (FIFO na coluna).
 */
async function getNextPosicaoForColuna(coluna, tx) {
  const result = await tx.kanbanCard.aggregate({
    where: { coluna },
    _max: { posicao: true },
  });
  return (result._max.posicao ?? 0) + 1;
}

/**
 * Aplica uma transição de status a um Lead.
 *
 * @param {object} params
 * @param {number} params.leadId
 * @param {string} params.newStatus - um dos LeadStatus (validado via statusMachine)
 * @param {object} params.user - { id, role, filialId, permissions }
 * @param {string} [params.reason] - motivo (obrigatório ao entrar em "Cancelado")
 * @param {object} [params.context] - dataHora, etc. (repassado para getSideEffects)
 * @returns {Promise<{ lead, sideEffectsApplied, history }>}
 */
export async function transitionStatus(params) {
  if (!params || typeof params !== 'object') {
    throw new AppError('Parâmetros inválidos para transitionStatus.', 400);
  }

  const { leadId, newStatus, user, reason = null, context = {} } = params;

  const leadIdInt = Number(leadId);
  if (!Number.isInteger(leadIdInt) || leadIdInt <= 0) {
    throw new AppError('leadId deve ser um inteiro positivo.', 400);
  }

  if (!user || typeof user !== 'object') {
    throw new AppError('Usuário autenticado é obrigatório.', 401);
  }

  return prisma.$transaction(async (tx) => {
    // 1. Lock da linha — evita dois clicks concorrentes aplicarem transições
    //    divergentes no mesmo Lead
    await tx.$executeRaw`SELECT id FROM leads WHERE id = ${leadIdInt} FOR UPDATE`;

    // 2. Carrega o Lead já travado
    const lead = await tx.lead.findFirst({
      where: { id: leadIdInt, deletedAt: null },
      include: { kanbanCard: true },
    });
    if (!lead) {
      throw new AppError('Lead não encontrado.', 404);
    }

    // 3. Isolamento por filial (gerente só mexe na própria filial)
    assertFilialAccess(lead, user);

    // 4. Guard de edição pós-venda — leads em Venda/Pós-venda são read-only
    //    exceto para ADM com permissão explícita (spec §9.14)
    if (requiresAdminToEdit(lead.status) && !hasPermission(user, 'crm:leads:edit-after-sale')) {
      throw new AppError(
        'Lead com venda concluída só pode ter o status alterado por ADM com permissão crm:leads:edit-after-sale.',
        403,
      );
    }

    // 5. Valida a transição via statusMachine (regras de §7 da spec)
    const validation = validateTransition(lead.status, newStatus);
    if (!validation.allowed) {
      throw new AppError(`Transição inválida: ${validation.reason}`, 400);
    }

    // 6. Motivo é obrigatório ao cancelar
    if (newStatus === LeadStatus.CANCELADO && (!reason || !String(reason).trim())) {
      throw new AppError('Motivo é obrigatório ao cancelar um Lead.', 400);
    }

    // 7. Descritores de side-effects específicos do status destino
    const sideEffects = getSideEffects(newStatus, { reason, ...context });

    // 8. Monta update do Lead — status + etapa derivada + campos de cancelamento
    const newEtapa = getEtapaForStatus(newStatus);
    const leadUpdateData = {
      status: newStatus,
      etapa: newEtapa,
    };
    const applyingCancel = sideEffects.some((e) => e.type === SideEffectType.SET_CANCEL_FIELDS);
    if (applyingCancel) {
      leadUpdateData.statusAntesCancelamento = lead.status;
      leadUpdateData.canceladoEm = new Date();
    }

    // 9. Atualiza o Lead
    const updatedLead = await tx.lead.update({
      where: { id: lead.id },
      data: leadUpdateData,
    });

    // 10. Move o KanbanCard para a nova coluna (fim da fila)
    const nextPosicao = await getNextPosicaoForColuna(newEtapa, tx);
    const updatedCard = await tx.kanbanCard.update({
      where: { leadId: lead.id },
      data: { coluna: newEtapa, posicao: nextPosicao },
    });

    // 11. Registra histórico — status_changed sempre
    const history = [];
    history.push(
      await addHistoryEvent(
        {
          leadId: lead.id,
          authorUserId: user.id ?? null,
          eventType: LeadEventType.STATUS_CHANGED,
          payload: { from: lead.status, to: newStatus },
        },
        tx,
      ),
    );

    // 12. Histórico dos side-effects
    for (const effect of sideEffects) {
      switch (effect.type) {
        case SideEffectType.SET_CANCEL_FIELDS:
          history.push(
            await addHistoryEvent(
              {
                leadId: lead.id,
                authorUserId: user.id ?? null,
                eventType: LeadEventType.LEAD_CANCELLED,
                payload: { reason },
              },
              tx,
            ),
          );
          break;
        case SideEffectType.AGENDA_OPEN:
          history.push(
            await addHistoryEvent(
              {
                leadId: lead.id,
                authorUserId: user.id ?? null,
                eventType: LeadEventType.AGENDA_SCHEDULED,
                payload: {
                  tipo: effect.payload.tipo,
                  dataHora: effect.payload.dataHora ?? null,
                },
              },
              tx,
            ),
          );
          // TODO(Task #15): enfileirar no outbox para integração real com Agenda
          break;
        case SideEffectType.NON_OPEN_OR_CREATE:
          // TODO(Task #15): enfileirar no outbox para integração com N.O.N.
          // Não emite LeadEventType.NON_GENERATED aqui — esse evento só é escrito
          // quando a N.O.N. realmente existir (o worker do outbox registra).
          break;
        default:
          // Side-effect desconhecido — defensivo
          break;
      }
    }

    return {
      lead: { ...updatedLead, kanbanCard: updatedCard },
      sideEffectsApplied: sideEffects.map((e) => e.type),
      history,
    };
  });
}

export const leadTransitionService = Object.freeze({
  transitionStatus,
});
