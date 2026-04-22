import * as leadCrmService from '../services/leadCrmService.js';
import { transitionStatus as transitionStatusService } from '../services/leadTransitionService.js';
import { LeadEventType } from '../domain/leadEvents.js';
import { SideEffectType } from '../services/statusMachine.js';

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

    const historyEvent = result.history.find(
      (h) => h.eventType === LeadEventType.STATUS_CHANGED,
    );

    // Side-effects que ainda dependem do outbox (Task #15) — por ora só declarados como pendentes.
    const outboxEvents = result.sideEffectsApplied
      .filter((t) => t === SideEffectType.AGENDA_OPEN || t === SideEffectType.NON_OPEN_OR_CREATE)
      .map((t) => ({ eventType: t, status: 'pending' }));

    return res.json({
      lead: result.lead,
      kanbanCard: result.lead.kanbanCard,
      historyEvent,
      outboxEvents,
    });
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
