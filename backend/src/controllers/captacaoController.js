import * as captacaoService from '../services/captacaoService.js';
import AppError from '../utils/AppError.js';
import { emitQueueUpdate } from '../config/socket.js';

export async function getQueueRanking(req, res, next) {
  try {
    const { branch_id } = req.params;
    const ranking = await captacaoService.getQueueRanking(branch_id);
    return res.json(ranking);
  } catch (error) {
    next(error);
  }
}

export async function processNewQuickLead(req, res, next) {
  try {
    const { branch_id } = req.body;
    if (!branch_id) {
      throw new AppError('A filial deve ser informada para a captação.', 400);
    }
    
    // Opcional: Validar telefones...
    
    const result = await captacaoService.assignLeadQuick(branch_id, req.body, req.user?.id);
    
    // Emitir via SOCKET.IO que a fila da filial atualizou
    emitQueueUpdate(branch_id);

    return res.status(201).json({
      message: 'Lead recebido e atribuído com sucesso!',
      assignment: result
    });
  } catch (error) {
    next(error);
  }
}

export async function processNewManualLead(req, res, next) {
  try {
    const { branch_id, assigned_user_id } = req.body;
    console.log('[CAPTACAO] Manual lead request:', { branch_id, assigned_user_id, telefone: req.body.telefone, nome: req.body.nome });
    if (!branch_id || !assigned_user_id) {
      throw new AppError('A filial e o vendedor alvo devem ser informados.', 400);
    }
    
    // Atribuir o lead a um consultor especifico
    const result = await captacaoService.assignLeadManual(branch_id, req.body, assigned_user_id);
    
    console.log('[CAPTACAO] Manual lead SUCCESS:', result);
    
    // Emitir via SOCKET.IO que a fila da filial atualizou
    emitQueueUpdate(branch_id);

    return res.status(201).json({
      message: 'Lead manual criado e atribuído com sucesso!',
      assignment: result
    });
  } catch (error) {
    console.error('[CAPTACAO] Manual lead ERROR:', error.message || error);
    next(error);
  }
}

export async function toggleAgentAvailability(req, res, next) {
  try {
    const { branch_id, is_available } = req.body;
    const user_id = req.user.id; // Assume que quem chama está toggleando o próprio status
    
    if (branch_id === undefined || is_available === undefined) {
      throw new AppError('Branch_id e is_available são obrigatórios.', 400);
    }

    const result = await captacaoService.toggleQueueStatus(branch_id, user_id, is_available);
    
    // Emitir via SOCKET.IO que a fila da filial atualizou
    emitQueueUpdate(branch_id);

    return res.json({ message: 'Disponibilidade alterada com sucesso.', status: result });
  } catch (error) {
    next(error);
  }
}

export async function getLeadHistory(req, res, next) {
  try {
    const { branch_id } = req.query;
    if (!branch_id) throw new AppError('filial_id não formecido na query.', 400);
    
    const historico = await captacaoService.getLeadHistory(branch_id);
    return res.json(historico);
  } catch (error) {
    next(error);
  }
}
