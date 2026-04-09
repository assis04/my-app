import prisma from "../config/prisma.js";
import AppError from '../utils/AppError.js';
import { ADMIN_ROLES } from '../utils/roles.js';

const VALID_STATUSES = ["PENDENTE", "EM_ANDAMENTO", "CONCLUIDA"];

export class TaskService {
  /**
   * Obtém as tarefas obedecendo as regras de visibilidade
   */
  static async getTasksForUser(user, { page = 1, limit = 50 } = {}) {
    const userInfo = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: { select: { nome: true } }, equipeId: true }
    });

    const isAdm = ADMIN_ROLES.includes(userInfo?.role?.nome);

    const includeRelations = {
        assignedToUser: { select: { id: true, nome: true } },
        assignedToEquipe: { select: { id: true, nome: true } },
        createdBy: { select: { id: true, nome: true } }
    };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const take = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * take;

    const where = isAdm ? {} : { OR: [{ assignedToUserId: user.id }, { createdById: user.id }] };

    if (!isAdm && userInfo.equipeId) {
      where.OR.push({ assignedToEquipeId: userInfo.equipeId });
    }

    const [data, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: includeRelations,
        orderBy: { dataVencimento: 'asc' },
        skip,
        take,
      }),
      prisma.task.count({ where }),
    ]);

    return { data, total, page: pageNum, limit: take, totalPages: Math.ceil(total / take) };
  }

  /**
   * Cria uma tarefa garantindo permissões
   */
  static async createTask(data, creator) {
    const creatorId = Number(creator.id);
    const userInfo = await prisma.user.findUnique({
        where: { id: creatorId },
        include: { role: true, equipeLiderada: true }
    });

    const isAdm = ADMIN_ROLES.includes(userInfo?.role?.nome);
    const isGerente = userInfo?.equipeLiderada?.length > 0;

    const assignedToEquipeId = data.assignedToEquipeId ? Number(data.assignedToEquipeId) : null;
    const assignedToUserId = data.assignedToUserId ? Number(data.assignedToUserId) : null;

    // Regra: Tarefa para Equipe
    if (assignedToEquipeId) {
        if (!isAdm && !isGerente) {
             throw new AppError("Apenas Administradores ou Gerentes podem atribuir tarefas para equipes.", 403);
        }
    } else {
        // Regra: Tarefa Individual (Não-ADM e Não-Gerente só criam para si mesmos)
        if (assignedToUserId && assignedToUserId !== creatorId) {
            if (!isAdm && !isGerente) {
                throw new AppError("Você só pode criar tarefas para si mesmo.", 403);
            }
        }
    }

    return prisma.task.create({
      data: {
        titulo: data.titulo,
        descricao: data.descricao,
        status: data.status || "PENDENTE",
        dataVencimento: data.dataVencimento ? new Date(data.dataVencimento) : null,
        createdById: creatorId,
        assignedToUserId: assignedToUserId,
        assignedToEquipeId: assignedToEquipeId
      },
      include: {
          assignedToUser: { select: { id: true, nome: true } },
          assignedToEquipe: { select: { id: true, nome: true } },
          createdBy: { select: { id: true, nome: true } }
      }
    });
  }

  /**
   * Atualiza status da tarefa.
   * Apenas o criador, o assignee ou um ADM pode alterar.
   */
  static async updateTaskStatus(taskId, status, userId) {
      if (!VALID_STATUSES.includes(status)) {
          throw new AppError(`Status inválido. Use: ${VALID_STATUSES.join(', ')}`, 400);
      }

      const numericTaskId = Number(taskId);
      const numericUserId = Number(userId);

      const task = await prisma.task.findUnique({
          where: { id: numericTaskId },
      });
      if (!task) throw new AppError("Tarefa não encontrada.", 404);

      // Verifica o role do USUARIO AUTENTICADO (não do criador da tarefa)
      const actingUser = await prisma.user.findUnique({
          where: { id: numericUserId },
          select: { role: { select: { nome: true } } }
      });

      const isAdm = ADMIN_ROLES.includes(actingUser?.role?.nome);
      const isOwner = task.createdById === numericUserId;
      const isAssignee = task.assignedToUserId === numericUserId;

      if (!isAdm && !isOwner && !isAssignee) {
          throw new AppError("Você não tem permissão para alterar o status desta tarefa.", 403);
      }

      return prisma.task.update({
          where: { id: numericTaskId },
          data: { status }
      });
  }

  /**
   * Edição completa — apenas campos permitidos são atualizados (whitelist).
   */
  static async updateTask(taskId, data, userId) {
      const numericTaskId = Number(taskId);
      const numericUserId = Number(userId);

      const task = await prisma.task.findUnique({ where: { id: numericTaskId } });
      if (!task) throw new AppError("Tarefa não encontrada.", 404);

      if (task.createdById !== numericUserId) {
          throw new AppError("Você não tem permissão para editar esta tarefa.", 403);
      }

      // Whitelist explícita — impede mass assignment de campos internos
      const updateData = {};
      if (data.titulo !== undefined)      updateData.titulo = data.titulo;
      if (data.descricao !== undefined)   updateData.descricao = data.descricao;
      if (data.status !== undefined) {
          if (!VALID_STATUSES.includes(data.status)) {
              throw new AppError(`Status inválido. Use: ${VALID_STATUSES.join(', ')}`, 400);
          }
          updateData.status = data.status;
      }
      if (data.dataVencimento !== undefined) {
          updateData.dataVencimento = data.dataVencimento ? new Date(data.dataVencimento) : null;
      }
      if (data.assignedToEquipeId !== undefined) {
          updateData.assignedToEquipeId = data.assignedToEquipeId ? Number(data.assignedToEquipeId) : null;
      }
      if (data.assignedToUserId !== undefined) {
          updateData.assignedToUserId = data.assignedToUserId ? Number(data.assignedToUserId) : null;
      }

      return prisma.task.update({ where: { id: numericTaskId }, data: updateData });
  }

  /**
   * Deleção — apenas o criador ou ADM pode excluir.
   */
  static async deleteTask(taskId, userId, userRole) {
      const numericTaskId = Number(taskId);
      const numericUserId = Number(userId);

      const task = await prisma.task.findUnique({ where: { id: numericTaskId } });
      if (!task) throw new AppError("Tarefa não encontrada.", 404);

      // userRole é uma string (ex: "ADM"), não um objeto
      const isAdm = ADMIN_ROLES.includes(userRole);
      if (!isAdm && task.createdById !== numericUserId) {
          throw new AppError("Você não tem permissão para excluir esta tarefa.", 403);
      }

      return prisma.task.delete({ where: { id: numericTaskId } });
  }
}
