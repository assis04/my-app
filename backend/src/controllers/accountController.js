import * as accountService from '../services/accountService.js';

/**
 * GET /api/crm/accounts
 * Listagem de contas — somente leitura.
 */
export async function list(req, res, next) {
  try {
    const { search, page, limit } = req.query;
    const result = await accountService.listAccounts({ search, page, limit }, req.user);
    return res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/crm/accounts/:id
 * Detalhes de uma conta com seus Leads atrelados.
 */
export async function getById(req, res, next) {
  try {
    const account = await accountService.getAccountById(req.params.id, req.user);
    return res.json(account);
  } catch (error) {
    next(error);
  }
}
