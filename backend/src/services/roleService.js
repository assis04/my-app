import prisma from '../config/prisma.js';
import AppError from '../utils/AppError.js';

export async function createRole({ nome, descricao, permissions }) {
  try {
    const newRole = await prisma.role.create({
      data: {
        nome: nome.toUpperCase().trim(),
        descricao: descricao || null,
        permissions: Array.isArray(permissions) ? permissions : [],
      },
    });
    return newRole;
  } catch (error) {
    if (error.code === 'P2002') {
      throw new AppError("Já existe um perfil com esse nome.", 409);
    }
    throw error;
  }
}

export async function getAssignableRoles(invokerRole) {
  const isAdm = invokerRole === 'ADM' || invokerRole === 'admin' || invokerRole === 'Administrador';

  const roles = await prisma.role.findMany({
    where: isAdm ? {} : { nome: { not: 'ADM' } },
    orderBy: { id: 'asc' },
  });

  return roles;
}

export async function getAllRoles() {
  return await prisma.role.findMany({ orderBy: { id: 'asc' } });
}

export async function updateRole(id, { nome, descricao, permissions }) {
  if (nome === 'ADM') {
    throw new AppError("Não é permitido alterar o nome do perfil ADM.", 403);
  }

  try {
    const updatedRole = await prisma.role.update({
      where: { id: Number(id) },
      data: {
        nome: nome ? nome.toUpperCase().trim() : undefined,
        descricao,
        permissions: Array.isArray(permissions) ? permissions : undefined,
      },
    });
    return updatedRole;
  } catch (error) {
    if (error.code === 'P2002') {
      throw new AppError("Já existe um perfil com esse nome.", 409);
    }
    throw error;
  }
}

export async function deleteRole(id) {
  const role = await prisma.role.findUnique({ where: { id: Number(id) } });
  if (!role) {
    throw new AppError("Perfil não encontrado.", 404);
  }
  if (role.nome === 'ADM') {
    throw new AppError("O perfil ADM não pode ser excluído.", 403);
  }

  try {
    await prisma.role.delete({ where: { id: Number(id) } });
  } catch (error) {
    if (error.code === 'P2003') {
      throw new AppError("Não é possível excluir: Existem usuários vinculados a este perfil.", 409);
    }
    throw error;
  }
}
