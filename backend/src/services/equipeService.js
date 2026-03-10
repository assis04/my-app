import prisma from '../config/prisma.js';
import AppError from '../utils/AppError.js';

export async function listEquipes() {
  return await prisma.equipe.findMany({
    orderBy: { nome: 'asc' },
    include: {
      lider: { select: { id: true, nome: true } },
      filial: { select: { id: true, nome: true } },
      membros: { select: { id: true, nome: true } },
    },
  });
}

export async function getEquipe(id) {
  const equipe = await prisma.equipe.findUnique({
    where: { id: Number(id) },
    include: {
      lider: { select: { id: true, nome: true, email: true } },
      filial: { select: { id: true, nome: true } },
      membros: { select: { id: true, nome: true, email: true, role: { select: { nome: true } } } },
    },
  });

  if (!equipe) {
    throw new AppError('Equipe não encontrada.', 404);
  }

  return equipe;
}

export async function createEquipe(data) {
  const { nome, descricao, liderId, filialId, membroIds } = data;
  
  try {
    const equipe = await prisma.equipe.create({
      data: {
        nome: nome.trim(),
        descricao: descricao || null,
        liderId: liderId ? Number(liderId) : null,
        filialId: filialId ? Number(filialId) : null,
        membros: membroIds && membroIds.length > 0
          ? { connect: membroIds.map(id => ({ id: Number(id) })) }
          : undefined,
      },
      include: {
        lider: { select: { id: true, nome: true } },
        filial: { select: { id: true, nome: true } },
        membros: { select: { id: true, nome: true } },
      },
    });
    return equipe;
  } catch (error) {
    if (error.code === 'P2002') {
      throw new AppError('Já existe uma equipe com esse nome.', 409);
    }
    throw error;
  }
}

export async function updateEquipe(id, data) {
  const { nome, descricao, liderId, filialId, ativo, membroIds } = data;
  
  const equipe = await prisma.equipe.update({
    where: { id: Number(id) },
    data: {
      nome: nome?.trim(),
      descricao,
      ativo,
      liderId: liderId !== undefined ? (liderId ? Number(liderId) : null) : undefined,
      filialId: filialId !== undefined ? (filialId ? Number(filialId) : null) : undefined,
      membros: membroIds
        ? { set: membroIds.map(mId => ({ id: Number(mId) })) }
        : undefined,
    },
    include: {
      lider: { select: { id: true, nome: true } },
      filial: { select: { id: true, nome: true } },
      membros: { select: { id: true, nome: true } },
    },
  });
  
  return equipe;
}

export async function deleteEquipe(id) {
  await prisma.equipe.delete({ where: { id: Number(id) } });
}
