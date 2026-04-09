import * as leadCrmService from '../services/leadCrmService.js';

export async function create(req, res, next) {
  try {
    const lead = await leadCrmService.createLead(req.body);
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
    });
    return res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const lead = await leadCrmService.getLeadById(req.params.id);
    return res.json(lead);
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const lead = await leadCrmService.updateLead(req.params.id, req.body);
    return res.json(lead);
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    await leadCrmService.deleteLead(req.params.id);
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
    const result = await leadCrmService.transferLeads(leadIds, preVendedorId);
    return res.json({ message: `${result.count} lead(s) transferido(s).`, count: result.count });
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
    const result = await leadCrmService.updateEtapaLote(leadIds, stage);
    return res.json({ message: `${result.count} lead(s) atualizado(s).`, count: result.count });
  } catch (error) {
    next(error);
  }
}
