/**
 * orcamentoController — handlers HTTP para endpoints de Orçamento (N.O.N.).
 *
 * Specs: specs/crm-non.md | Plan: validated-swimming-otter.md
 */

import * as orcamentoService from '../services/orcamentoService.js';

export async function list(req, res, next) {
  try {
    const { nome, telefone, status, filialId, userId, dataInicio, dataFim, page, limit } = req.query;
    const result = await orcamentoService.listOrcamentos(
      { nome, telefone, status, filialId, userId, dataInicio, dataFim, page, limit },
      req.user,
    );
    return res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function create(req, res, next) {
  try {
    const orcamento = await orcamentoService.createOrcamento({
      leadId: req.body.leadId,
      user: req.user,
    });
    return res.status(201).json(orcamento);
  } catch (error) {
    next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const orcamento = await orcamentoService.getOrcamentoById(req.params.id, req.user);
    return res.json(orcamento);
  } catch (error) {
    next(error);
  }
}

export async function getByLeadId(req, res, next) {
  try {
    const orcamento = await orcamentoService.getOrcamentoByLeadId(req.params.id, req.user);
    if (!orcamento) {
      return res.status(404).json({ status: 'fail', message: 'Nenhum Orçamento vinculado a este Lead.' });
    }
    return res.json(orcamento);
  } catch (error) {
    next(error);
  }
}

export async function transitionStatus(req, res, next) {
  try {
    const orcamento = await orcamentoService.transitionOrcamentoStatus({
      id: req.params.id,
      newStatus: req.body.status,
      user: req.user,
    });
    return res.json(orcamento);
  } catch (error) {
    next(error);
  }
}

export async function cancel(req, res, next) {
  try {
    const orcamento = await orcamentoService.cancelOrcamento({
      id: req.params.id,
      motivo: req.body.motivo,
      user: req.user,
    });
    return res.json(orcamento);
  } catch (error) {
    next(error);
  }
}

export async function reactivate(req, res, next) {
  try {
    const orcamento = await orcamentoService.reactivateOrcamento({
      id: req.params.id,
      user: req.user,
    });
    return res.json(orcamento);
  } catch (error) {
    next(error);
  }
}
