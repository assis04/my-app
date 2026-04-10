import prisma from '../config/prisma.js';
import AppError from '../utils/AppError.js';

const VALID_PERMISSIONS = [
  'rh:usuarios:create', 'rh:usuarios:read', 'rh:usuarios:update', 'rh:usuarios:delete',
  'rh:perfis:create', 'rh:perfis:read', 'rh:perfis:update', 'rh:perfis:delete',
  'rh:equipes:create', 'rh:equipes:read', 'rh:equipes:update', 'rh:equipes:delete',
  'rh:filiais:create', 'rh:filiais:read', 'rh:filiais:update', 'rh:filiais:delete',
  'crm:leads:create', 'crm:leads:read', 'crm:leads:update', 'crm:leads:delete',
  'crm:leads:transfer', 'crm:leads:read:branch', 'crm:leads:read:all',
  'crm:accounts:create', 'crm:accounts:read', 'crm:accounts:update', 'crm:accounts:delete',
  'crm:orcamentos:create', 'crm:orcamentos:read', 'crm:orcamentos:update', 'crm:orcamentos:delete',
  'crm:fila:read', 'crm:fila:manage',
];

function validatePermissions(permissions, isCallerAdm) {
  if (!Array.isArray(permissions)) return [];

  if (permissions.includes('*') && !isCallerAdm) {
    throw new AppError("Apenas administradores podem atribuir permissão wildcard.", 403);
  }

  if (!permissions.includes('*')) {
    const invalid = permissions.filter(p => !VALID_PERMISSIONS.includes(p));
    if (invalid.length > 0) {
      throw new AppError(`Permissões inválidas: ${invalid.join(', ')}`, 400);
    }
  }

  return permissions;
}

export async function createRole({ nome, descricao, permissions }, callerRole) {
  const isCallerAdm = callerRole === 'ADM' || callerRole === 'admin' || callerRole === 'Administrador';
  const validatedPerms = validatePermissions(permissions, isCallerAdm);

  try {
    const newRole = await prisma.role.create({
      data: {
        nome: nome.toUpperCase().trim(),
        descricao: descricao || null,
        permissions: validatedPerms,
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

export async function updateRole(id, { nome, descricao, permissions }, callerRole) {
  const existingRole = await prisma.role.findUnique({ where: { id: Number(id) } });
  if (!existingRole) {
    throw new AppError("Perfil não encontrado.", 404);
  }

  if (existingRole.nome === 'ADM') {
    throw new AppError("Não é permitido alterar o perfil ADM.", 403);
  }

  const isCallerAdm = callerRole === 'ADM' || callerRole === 'admin' || callerRole === 'Administrador';
  const validatedPerms = permissions !== undefined
    ? validatePermissions(permissions, isCallerAdm)
    : undefined;

  try {
    const updatedRole = await prisma.role.update({
      where: { id: Number(id) },
      data: {
        nome: nome ? nome.toUpperCase().trim() : undefined,
        descricao,
        permissions: validatedPerms,
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
