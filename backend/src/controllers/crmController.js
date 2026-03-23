import * as crmService from '../services/crmService.js';

export async function getOrcamentos(req, res, next) {
  try {
    const filters = req.query;
    const orcamentos = await crmService.getAllOrcamentos(filters);
    return res.json(orcamentos);
  } catch (error) {
    next(error);
  }
}
