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
  isValidStatus,
  LeadStatus,
  LeadEtapa,
} from '../domain/leadStatus.js';
import { isValidTemperatura } from '../domain/leadTemperatura.js';
import { LeadEventType } from '../domain/leadEvents.js';
import { add as addHistoryEvent } from './leadHistoryService.js';
import { enqueue as enqueueOutbox } from './outboxService.js';

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
          await enqueueOutbox(
            {
              aggregate: 'lead',
              aggregateId: lead.id,
              eventType: SideEffectType.AGENDA_OPEN,
              payload: {
                tipo: effect.payload.tipo,
                dataHora: effect.payload.dataHora ?? null,
                triggeredBy: user.id ?? null,
              },
            },
            tx,
          );
          break;
        // NON_OPEN_OR_CREATE removido — Orçamento é entidade separada criada
        // explicitamente via POST /api/crm/orcamentos (specs/crm-non.md).
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

/**
 * Define (ou altera) a temperatura de um Lead.
 *
 * Temperatura é campo manual (§4.1 da spec) — só setado por usuário autenticado,
 * nunca por integração externa nem cálculo automático. Guards aplicados:
 *   - Filial isolation (gerente ≠ outra filial)
 *   - Read-only pós-venda (Venda/Pós-venda exigem crm:leads:edit-after-sale)
 *
 * Registra evento `temperatura_changed` no LeadHistory com payload { from, to }.
 * Se o valor enviado for igual ao atual, é no-op (nenhum evento registrado).
 *
 * @param {object} params
 * @param {number|string} params.leadId
 * @param {string} params.temperatura - um dos LeadTemperatura
 * @param {object} params.user - { id, role, filialId, permissions }
 * @returns {Promise<{ lead, historyEvent, changed }>}
 */
export async function setTemperatura(params) {
  if (!params || typeof params !== 'object') {
    throw new AppError('Parâmetros inválidos para setTemperatura.', 400);
  }

  const { leadId, temperatura, user } = params;

  const leadIdInt = Number(leadId);
  if (!Number.isInteger(leadIdInt) || leadIdInt <= 0) {
    throw new AppError('leadId deve ser um inteiro positivo.', 400);
  }
  if (!user || typeof user !== 'object') {
    throw new AppError('Usuário autenticado é obrigatório.', 401);
  }
  if (!isValidTemperatura(temperatura)) {
    throw new AppError(`Temperatura inválida: "${temperatura}"`, 400);
  }

  return prisma.$transaction(async (tx) => {
    // Lock otimista da row — evita dois clicks sobrescreverem
    await tx.$executeRaw`SELECT id FROM leads WHERE id = ${leadIdInt} FOR UPDATE`;

    const lead = await tx.lead.findFirst({
      where: { id: leadIdInt, deletedAt: null },
      include: { kanbanCard: true },
    });
    if (!lead) throw new AppError('Lead não encontrado.', 404);

    assertFilialAccess(lead, user);

    if (requiresAdminToEdit(lead.status) && !hasPermission(user, 'crm:leads:edit-after-sale')) {
      throw new AppError(
        'Lead com venda concluída só pode ter a temperatura alterada por ADM com permissão crm:leads:edit-after-sale.',
        403,
      );
    }

    // No-op quando nada muda (evita evento fantasma no histórico)
    if (lead.temperatura === temperatura) {
      return { lead, historyEvent: null, changed: false };
    }

    const updatedLead = await tx.lead.update({
      where: { id: lead.id },
      data: { temperatura },
      include: { kanbanCard: true },
    });

    const historyEvent = await addHistoryEvent(
      {
        leadId: lead.id,
        authorUserId: user.id ?? null,
        eventType: LeadEventType.TEMPERATURA_CHANGED,
        payload: { from: lead.temperatura, to: temperatura },
      },
      tx,
    );

    return { lead: updatedLead, historyEvent, changed: true };
  });
}

/**
 * Reativa um Lead cancelado. Dois modos:
 *
 *   modo = "reativar" → restaura o próprio Lead para statusAntesCancelamento
 *                       (ou "Em prospecção" se nulo), preenche reativadoEm,
 *                       move KanbanCard, grava history
 *
 *   modo = "novo"     → preserva o Lead cancelado intacto e cria um Lead NOVO
 *                       vinculado ao mesmo Account, com campos de identidade
 *                       copiados mas pipeline zerado (status "Em prospecção")
 *
 * NÃO usa validateTransition — a statusMachine bloqueia sair de "Cancelado"
 * intencionalmente (spec §7.1). A reativação é um fluxo separado, role-gated,
 * explícito por design.
 *
 * Permissão: crm:leads:reactivate (spec §3)
 *
 * @param {object} params
 * @param {number|string} params.leadId
 * @param {'reativar'|'novo'} params.modo
 * @param {string} [params.motivo]
 * @param {object} params.user
 * @returns {Promise<object>} — shape depende do modo:
 *   reativar: { modo, lead, sideEffectsApplied: [], history: [...] }
 *   novo:     { modo, leadAntigo, leadNovo }
 */
export async function reactivateLead(params) {
  if (!params || typeof params !== 'object') {
    throw new AppError('Parâmetros inválidos para reactivateLead.', 400);
  }

  const { leadId, modo, motivo = '', user } = params;

  const leadIdInt = Number(leadId);
  if (!Number.isInteger(leadIdInt) || leadIdInt <= 0) {
    throw new AppError('leadId deve ser um inteiro positivo.', 400);
  }
  if (!user || typeof user !== 'object') {
    throw new AppError('Usuário autenticado é obrigatório.', 401);
  }
  if (modo !== 'reativar' && modo !== 'novo') {
    throw new AppError('modo deve ser "reativar" ou "novo".', 400);
  }
  if (!hasPermission(user, 'crm:leads:reactivate')) {
    throw new AppError('Permissão crm:leads:reactivate necessária para reativar Lead.', 403);
  }

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM leads WHERE id = ${leadIdInt} FOR UPDATE`;

    const lead = await tx.lead.findFirst({
      where: { id: leadIdInt, deletedAt: null },
      include: { kanbanCard: true },
    });
    if (!lead) throw new AppError('Lead não encontrado.', 404);

    assertFilialAccess(lead, user);

    if (lead.status !== LeadStatus.CANCELADO) {
      throw new AppError('Só é possível reativar Leads com status "Cancelado".', 400);
    }

    if (modo === 'reativar') {
      // Restaura para statusAntesCancelamento (ou EM_PROSPECCAO se nulo/inválido)
      const prior = lead.statusAntesCancelamento;
      const targetStatus = (prior && isValidStatus(prior)) ? prior : LeadStatus.EM_PROSPECCAO;
      const targetEtapa = getEtapaForStatus(targetStatus);

      const updatedLead = await tx.lead.update({
        where: { id: lead.id },
        data: {
          status: targetStatus,
          etapa: targetEtapa,
          reativadoEm: new Date(),
          // canceladoEm é preservado (spec §4.1) — trilha de auditoria
        },
      });

      const nextPosicao = await getNextPosicaoForColuna(targetEtapa, tx);
      const updatedCard = await tx.kanbanCard.update({
        where: { leadId: lead.id },
        data: { coluna: targetEtapa, posicao: nextPosicao },
      });

      const history = [];
      history.push(
        await addHistoryEvent(
          {
            leadId: lead.id,
            authorUserId: user.id ?? null,
            eventType: LeadEventType.STATUS_CHANGED,
            payload: { from: LeadStatus.CANCELADO, to: targetStatus },
          },
          tx,
        ),
      );
      history.push(
        await addHistoryEvent(
          {
            leadId: lead.id,
            authorUserId: user.id ?? null,
            eventType: LeadEventType.LEAD_REACTIVATED,
            payload: motivo ? { motivo } : {},
          },
          tx,
        ),
      );

      return {
        modo: 'reativar',
        lead: { ...updatedLead, kanbanCard: updatedCard },
        sideEffectsApplied: [],
        history,
      };
    }

    // modo === 'novo'
    const newLead = await tx.lead.create({
      data: {
        // Identidade — copiada do lead antigo
        nome: lead.nome,
        sobrenome: lead.sobrenome,
        celular: lead.celular,
        email: lead.email,
        cpfCnpj: lead.cpfCnpj,
        cep: lead.cep,
        endereco: lead.endereco,
        // Cônjuge — preserva contexto familiar
        conjugeNome: lead.conjugeNome,
        conjugeSobrenome: lead.conjugeSobrenome,
        conjugeCelular: lead.conjugeCelular,
        conjugeEmail: lead.conjugeEmail,
        // Imóvel — contexto comercial vale carregar
        tipoImovel: lead.tipoImovel,
        statusImovel: lead.statusImovel,
        // Marketing — origem original do contato
        canal: lead.canal,
        origem: lead.origem,
        parceria: lead.parceria,
        origemCanal: lead.origemCanal,
        // Atribuições — preserva (ADM pode transferir depois)
        contaId: lead.contaId,
        filialId: lead.filialId,
        preVendedorId: lead.preVendedorId,
        vendedorId: lead.vendedorId,
        gerenteId: lead.gerenteId,
        // Pipeline — começa do zero
        status: LeadStatus.EM_PROSPECCAO,
        etapa: LeadEtapa.PROSPECCAO,
        temperatura: null,
        fonte: 'crm',
      },
    });

    const nextPosicao = await getNextPosicaoForColuna(LeadEtapa.PROSPECCAO, tx);
    const newCard = await tx.kanbanCard.create({
      data: {
        leadId: newLead.id,
        coluna: LeadEtapa.PROSPECCAO,
        posicao: nextPosicao,
      },
    });

    // History cruzado — ambos os leads referenciam um ao outro para auditoria
    await addHistoryEvent(
      {
        leadId: lead.id,
        authorUserId: user.id ?? null,
        eventType: LeadEventType.REACTIVATED_AS_NEW_LEAD,
        payload: { newLeadId: newLead.id, ...(motivo ? { motivo } : {}) },
      },
      tx,
    );
    await addHistoryEvent(
      {
        leadId: newLead.id,
        authorUserId: user.id ?? null,
        eventType: LeadEventType.CREATED_FROM_REACTIVATION,
        payload: { sourceLeadId: lead.id, ...(motivo ? { motivo } : {}) },
      },
      tx,
    );

    return {
      modo: 'novo',
      leadAntigo: lead,
      leadNovo: { ...newLead, kanbanCard: newCard },
    };
  });
}

export const leadTransitionService = Object.freeze({
  transitionStatus,
  setTemperatura,
  reactivateLead,
});
