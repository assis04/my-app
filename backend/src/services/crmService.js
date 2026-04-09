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
    dataFim,
    page = 1,
    limit = 50
  } = filters;

  const where = {};

  if (nome) {
    where.nome = { contains: nome, mode: 'insensitive' };
  }
  if (telefone) {
    where.celular = { contains: telefone };
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
    where.vendedorId = parseInt(userId, 10);
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

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const take = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (pageNum - 1) * take;

  where.deletedAt = null;

  const [rawData, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: {
        vendedor: {
          select: { id: true, nome: true, email: true }
        },
        filial: {
          select: { id: true, nome: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.lead.count({ where }),
  ]);

  const data = rawData.map((item) => ({
    ...item,
    telefone: item.celular,
    user: item.vendedor,
  }));

  return { data, total, page: pageNum, limit: take, totalPages: Math.ceil(total / take) };
}
