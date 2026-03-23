import prisma from '../config/prisma.js';
import AppError from '../utils/AppError.js';

export async function listFiliais() {
  console.log('[DEBUG] listFiliais called with manager include');
  try {
    return await prisma.filial.findMany({
      orderBy: { nome: 'asc' },
      include: {
        manager: { select: { id: true, nome: true } },
        _count: { select: { users: true, equipes: true } },
      },
    });
  } catch (err) {
    console.error('[ERROR] listFiliais Prisma error:', err.message);
    throw err;
  }
}

export async function getFilial(id) {
  const filial = await prisma.filial.findUnique({
    where: { id: Number(id) },
    include: {
      manager: { select: { id: true, nome: true } },
      users: { select: { id: true, nome: true, email: true } },
      equipes: { select: { id: true, nome: true } },
      _count: { select: { users: true, equipes: true } },
    },
  });

  if (!filial) throw new AppError('Filial não encontrada.', 404);
  return filial;
}

export async function createFilial(data) {
  const { nome, endereco, managerId } = data;
  if (!nome) throw new AppError('O nome da filial é obrigatório.', 400);

  try {
    const filial = await prisma.filial.create({
      data: { 
        nome: nome.trim(), 
        endereco: endereco?.trim() || null,
        managerId: managerId ? parseInt(managerId, 10) : null
      },
    });
    return filial;
  } catch (error) {
    if (error.code === 'P2002') {
      throw new AppError('Já existe uma filial com esse nome.', 409);
    }
    throw error;
  }
}

export async function updateFilial(id, data) {
  const { nome, endereco, managerId } = data;

  try {
    const filial = await prisma.filial.update({
      where: { id: Number(id) },
      data: {
        nome: nome?.trim(),
        endereco: endereco?.trim() ?? undefined,
        managerId: managerId !== undefined ? (managerId ? parseInt(managerId, 10) : null) : undefined
      },
    });
    return filial;
  } catch (error) {
    if (error.code === 'P2002') {
      throw new AppError('Já existe uma filial com esse nome.', 409);
    }
    throw error;
  }
}

export async function deleteFilial(id) {
  try {
    await prisma.filial.delete({ where: { id: Number(id) } });
  } catch (error) {
    if (error.code === 'P2003') {
      throw new AppError('Não é possível remover: existem usuários ou equipes vinculados a esta filial.', 409);
    }
    throw error;
  }
}
