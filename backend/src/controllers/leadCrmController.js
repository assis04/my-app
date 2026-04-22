import * as leadCrmService from '../services/leadCrmService.js';
import {
  transitionStatus as transitionStatusService,
  setTemperatura as setTemperaturaService,
  reactivateLead as reactivateLeadService,
} from '../services/leadTransitionService.js';
import { listByLeadPaginated as listLeadHistoryPaginated } from '../services/leadHistoryService.js';
import { LeadStatus } from '../domain/leadStatus.js';
import { LeadEventType } from '../domain/leadEvents.js';
import { SideEffectType } from '../services/statusMachine.js';

/**
 * Formata o retorno do leadTransitionService para o contrato público
 * dos endpoints que envolvem transição de status (/status, /cancel, /reactivate).
 *
 * Contrato: plan §4.1 — { lead, kanbanCard, historyEvent, outboxEvents[] }
 */
function formatTransitionResponse(result) {
  const historyEvent = result.history.find(
    (h) => h.eventType === LeadEventType.STATUS_CHANGED,
  );
  const outboxEvents = result.sideEffectsApplied
    .filter((t) => t === SideEffectType.AGENDA_OPEN || t === SideEffectType.NON_OPEN_OR_CREATE)
    .map((t) => ({ eventType: t, status: 'pending' }));

  return {
    lead: result.lead,
    kanbanCard: result.lead.kanbanCard,
    historyEvent,
    outboxEvents,
  };
}

export async function create(req, res, next) {
  try {
    const lead = await leadCrmService.createLead(req.body, req.user);
    return res.status(201).json(lead);
  } catch (error) {
    next(error);
  }
}

export async function list(req, res, next) {
  try {
    const { search, status, pre_vendedor_id, page, limit } = req.query;
    const result = await leadCrmService.listLeads({
      search,
      status,
      preVendedorId: pre_vendedor_id,
      page,
      limit,
    }, req.user);
    return res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const lead = await leadCrmService.getLeadById(req.params.id, req.user);
    return res.json(lead);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/crm/leads/:id/history — Task #13
 * Contrato: plan §4.5
 *
 * Query:
 *   ?cursor=123   id do último item da página anterior (opcional)
 *   ?limit=50     tamanho da página (1..200, default 50)
 *
 * Response 200: { items, nextCursor }
 *
 * Fluxo: primeiro valida que o Lead existe e o usuário tem acesso
 * (filial isolation via getLeadById), depois pagina o histórico.
 * Duas queries mas contrato limpo e permissionamento consistente.
 */
export async function getLeadHistory(req, res, next) {
  try {
    // Enforce 404 + filial isolation antes de expor o histórico
    await leadCrmService.getLeadById(req.params.id, req.user);

    const result = await listLeadHistoryPaginated(req.params.id, {
      cursor: req.query.cursor,
      limit: req.query.limit,
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const lead = await leadCrmService.updateLead(req.params.id, req.body, req.user);
    return res.json(lead);
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    await leadCrmService.deleteLead(req.params.id, req.user);
    return res.json({ message: 'Lead removido com sucesso.' });
  } catch (error) {
    next(error);
  }
}

export async function transfer(req, res, next) {
  try {
    const { leadIds, preVendedorId } = req.body;
    if (!leadIds?.length || !preVendedorId) {
      return res.status(400).json({ message: 'leadIds e preVendedorId são obrigatórios.' });
    }
    const result = await leadCrmService.transferLeads(leadIds, preVendedorId, req.user);
    return res.json({ message: `${result.count} lead(s) transferido(s).`, count: result.count });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/crm/leads/:id/status — Task #9
 * Contrato: plan §4.1
 *
 * Body: { status, motivo?, contexto?: { agendadoPara? } }
 * Response 200: { lead, kanbanCard, historyEvent, outboxEvents }
 *
 * Erros delegados ao errorHandler via next():
 *   - 400 transição inválida / motivo ausente ao cancelar
 *   - 403 filial / edição pós-venda
 *   - 404 Lead não existe
 */
export async function transitionStatus(req, res, next) {
  try {
    const { status, motivo, contexto = {} } = req.body;

    const result = await transitionStatusService({
      leadId: req.params.id,
      newStatus: status,
      user: req.user,
      reason: motivo ?? null,
      // traduz o contrato público (agendadoPara) pro interno (dataHora)
      context: {
        ...contexto,
        dataHora: contexto.agendadoPara ?? contexto.dataHora ?? null,
      },
    });

    return res.json(formatTransitionResponse(result));
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/crm/leads/:id/cancel — Task #11
 * Contrato: plan §4.2
 *
 * Body: { motivo: string } (obrigatório)
 * Response 200: mesma shape de /status (via formatTransitionResponse)
 *
 * Wrapper fino em cima de transitionStatus — delega pro mesmo fluxo
 * transacional com newStatus="Cancelado". O orquestrador (Task #8)
 * cuida de:
 *   - Preencher statusAntesCancelamento com o status anterior
 *   - Preencher canceladoEm
 *   - Mover KanbanCard para coluna "Cancelados"
 *   - Registrar status_changed + lead_cancelled no histórico
 *   - Validar a transição via statusMachine
 *   - Aplicar guards (filial, edit-after-sale se aplicável)
 *
 * Cancelar é universal (§9.15 da spec) — qualquer responsável pode;
 * só reativação é role-gated.
 */
export async function cancelLead(req, res, next) {
  try {
    const result = await transitionStatusService({
      leadId: req.params.id,
      newStatus: LeadStatus.CANCELADO,
      user: req.user,
      reason: req.body.motivo,
    });
    return res.json(formatTransitionResponse(result));
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/crm/leads/:id/reactivate — Task #12
 * Contrato: plan §4.3
 *
 * Body: { modo: "reativar" | "novo", motivo?: string }
 *
 * Response 200 (modo="reativar"): mesma shape de /status — Lead restaurado
 *   para o status pré-cancelamento.
 * Response 201 (modo="novo"): { leadAntigo, leadNovo } — status code 201
 *   porque um novo recurso foi criado.
 *
 * Permissão role-gated: crm:leads:reactivate (checado no service).
 */
export async function reactivateLead(req, res, next) {
  try {
    const result = await reactivateLeadService({
      leadId: req.params.id,
      modo: req.body.modo,
      motivo: req.body.motivo ?? '',
      user: req.user,
    });

    if (result.modo === 'reativar') {
      return res.json(formatTransitionResponse(result));
    }
    // modo === 'novo' → 201 Created (novo Lead nasceu)
    return res.status(201).json({
      leadAntigo: result.leadAntigo,
      leadNovo: result.leadNovo,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/crm/leads/:id/temperatura — Task #10
 * Contrato: plan §4.4
 *
 * Body: { temperatura: "Muito interessado" | "Interessado" | "Sem interesse" }
 * Response 200: { lead, historyEvent, changed }
 *   - changed=false quando o valor era igual ao atual (no-op)
 *   - historyEvent=null no mesmo caso
 */
export async function setTemperatura(req, res, next) {
  try {
    const result = await setTemperaturaService({
      leadId: req.params.id,
      temperatura: req.body.temperatura,
      user: req.user,
    });
    return res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateEtapa(req, res, next) {
  try {
    const { leadIds, etapaJornada, etapa } = req.body;
    const stage = etapa || etapaJornada;
    if (!leadIds?.length || !stage) {
      return res.status(400).json({ message: 'leadIds e etapa são obrigatórios.' });
    }
    const result = await leadCrmService.updateEtapaLote(leadIds, stage, req.user);
    return res.json({ message: `${result.count} lead(s) atualizado(s).`, count: result.count });
  } catch (error) {
    next(error);
  }
}
