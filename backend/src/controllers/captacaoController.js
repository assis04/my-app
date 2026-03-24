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
    const body = req.body || {};
    const { branch_id } = body;

    // Removed debug log
      hasBody: !!req.body,
      contentType: req.headers['content-type'],
      branch_id,
      hasFile: !!req.file 
    });

    if (!branch_id) {
      throw new AppError('A filial deve ser informada para a captação.', 400);
    }
    
    // Capturar o caminho do arquivo se houver upload
    const leadData = {
      ...body,
      plantaPath: req.file ? req.file.path.replace(/\\/g, '/') : undefined
    };

    const result = await captacaoService.assignLeadQuick(branch_id, leadData, req.user?.id);
    
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
    const body = req.body || {};
    const { branch_id, assigned_user_id } = body;
    
    // Removed debug log
      hasBody: !!req.body,
      contentType: req.headers['content-type'],
      branch_id, 
      assigned_user_id, 
      telefone: body.telefone, 
      nome: body.nome,
      hasFile: !!req.file 
    });

    if (!branch_id || !assigned_user_id) {
      throw new AppError('A filial e o vendedor alvo devem ser informados.', 400);
    }
    
    // Capturar o caminho do arquivo se houver upload
    const leadData = {
      ...body,
      plantaPath: req.file ? req.file.path.replace(/\\/g, '/') : undefined
    };

    // Atribuir o lead a um consultor especifico
    const result = await captacaoService.assignLeadManual(branch_id, leadData, assigned_user_id);
    
    // Removed success log
    
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
    const { branch_id, is_available, user_id: target_user_id } = req.body;
    const requester_id = req.user.id;
    const isTargetingSelf = !target_user_id || Number(target_user_id) === Number(requester_id);
    const userIdToToggle = isTargetingSelf ? requester_id : Number(target_user_id);
    
    if (branch_id === undefined || is_available === undefined) {
      throw new AppError('Branch_id e is_available são obrigatórios.', 400);
    }

    // Validação de Permissão para alterar status de OUTRA pessoa
    if (!isTargetingSelf) {
      const isAdm = ['ADM', 'Administrador', 'admin'].includes(req.user.role);
      const isGerente = ['Gerente', 'GERENTE'].includes(req.user.role);
      
      if (!isAdm) {
        if (!isGerente) {
          throw new AppError('Acesso Negado: Apenas Gerentes ou ADMs podem alterar o status de outros vendedores.', 403);
        }
        
        // Se for Gerente, deve ser da mesma filial
        if (Number(req.user.filial_id) !== Number(branch_id)) {
          throw new AppError('Acesso Negado: Gerentes só podem gerir vendedores da sua própria filial.', 403);
        }
      }
    }

    const result = await captacaoService.toggleQueueStatus(branch_id, userIdToToggle, is_available);
    
    // Emitir via SOCKET.IO que a fila da filial atualizou
    emitQueueUpdate(branch_id);

    return res.json({ 
      message: 'Disponibilidade alterada com sucesso.', 
      status: result,
      userId: userIdToToggle
    });
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
