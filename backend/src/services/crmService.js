import prisma from '../config/prisma.js';
import AppError from '../utils/AppError.js';

export async function getAllOrcamentos(filters = {}) {
  const {
    nome,
    telefone,
    status,
    filialId,
    etapa,
    canal,
    origem,
    parceria,
    userId, // Responsável
    dataInicio,
    dataFim
  } = filters;

  const where = {};

  if (nome) {
    where.nome = { contains: nome, mode: 'insensitive' };
  }
  if (telefone) {
    where.telefone = { contains: telefone };
  }
  if (status) {
    where.status = status;
  }
  if (filialId) {
    where.filialId = parseInt(filialId, 10);
  }
  if (etapa) {
    where.etapa = etapa;
  }
  if (canal) {
    where.canal = canal;
  }
  if (origem) {
    where.origem = origem;
  }
  if (parceria) {
    where.parceria = parceria;
  }
  if (userId) {
    where.userId = parseInt(userId, 10);
  }
  
  if (dataInicio || dataFim) {
    where.createdAt = {};
    if (dataInicio) {
      where.createdAt.gte = new Date(dataInicio);
    }
    if (dataFim) {
      const end = new Date(dataFim);
      end.setUTCHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const clients = await prisma.client.findMany({
    where,
    include: {
      user: {
        select: { id: true, nome: true, email: true }
      },
      filial: {
        select: { id: true, nome: true }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return clients;
}
