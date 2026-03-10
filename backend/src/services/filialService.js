import prisma from '../config/prisma.js';
import AppError from '../utils/AppError.js';

export async function listFiliais() {
  return await prisma.filial.findMany({
    orderBy: { nome: 'asc' },
    include: {
      _count: { select: { users: true, equipes: true } },
    },
  });
}

export async function getFilial(id) {
  const filial = await prisma.filial.findUnique({
    where: { id: Number(id) },
    include: {
      users: { select: { id: true, nome: true, email: true } },
      equipes: { select: { id: true, nome: true } },
      _count: { select: { users: true, equipes: true } },
    },
  });

  if (!filial) throw new AppError('Filial não encontrada.', 404);
  return filial;
}

export async function createFilial(data) {
  const { nome, endereco } = data;
  if (!nome) throw new AppError('O nome da filial é obrigatório.', 400);

  try {
    const filial = await prisma.filial.create({
      data: { nome: nome.trim(), endereco: endereco?.trim() || null },
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
  const { nome, endereco } = data;

  try {
    const filial = await prisma.filial.update({
      where: { id: Number(id) },
      data: {
        nome: nome?.trim(),
        endereco: endereco?.trim() ?? null,
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
