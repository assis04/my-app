import bcrypt from "bcryptjs";
import prisma from '../config/prisma.js';
import AppError from '../utils/AppError.js';

export async function findUserByEmail(email) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { role: true },
  });

  if (!user) return null;

  return {
    ...user,
    role_nome: user.role?.nome,
    role_id: user.roleId
  };
}

export async function createUserByAdminOrHR({ nome, email, password, roleId, filialId }, invokerUser) {
  if (!invokerUser) {
    throw new AppError('Acesso negado: Usuário não autenticado.', 401);
  }

  if (!nome || !email || !password || !roleId) {
    throw new AppError('Todos os campos obrigatórios (nome, email, password, roleId) devem ser preenchidos.', 400);
  }

  const targetRole = await prisma.role.findUnique({ where: { id: parseInt(roleId) } });
  if (!targetRole) {
    throw new AppError('Perfil não encontrado.', 404);
  }

  const invokerUserDb = await prisma.user.findUnique({ 
    where: { id: invokerUser.id }, 
    include: { role: true } 
  });
  const invokerRole = invokerUserDb?.role;

  if (!invokerRole || (invokerRole.nome !== 'ADM' && invokerRole.nome !== 'RH')) {
    throw new AppError('Acesso Negado: Apenas RH e ADM podem criar usuários.', 403);
  }

  if (targetRole.nome === 'ADM' && invokerRole.nome !== 'ADM') {
    throw new AppError('Acesso Negado: Somente Administradores podem criar usuários de nível ADM.', 403);
  }

  const normalizedEmail = email.trim().toLowerCase();
  
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const newUser = await prisma.user.create({
    data: {
      nome: nome.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      roleId: targetRole.id,
      filialId: filialId ? parseInt(filialId) : null,
      createdById: invokerUser.id
    }
  });

  return { id: newUser.id, nome: newUser.nome, email: newUser.email, role: targetRole.nome };
}

export async function listUsers() {
  const users = await prisma.user.findMany({
    orderBy: { nome: 'asc' },
    select: {
      id: true,
      nome: true,
      email: true,
      ativo: true,
      role: { select: { id: true, nome: true } },
      filial: { select: { id: true, nome: true } }
    }
  });

  return users.map(u => ({
    id: u.id,
    nome: u.nome,
    email: u.email,
    ativo: u.ativo,
    roleId: u.role?.id,
    perfil: u.role?.nome || 'Sem Perfil',
    filialId: u.filial?.id,
    filial: u.filial?.nome || '-'
  }));
}

export async function updateUser(id, data, invokerUser) {
  const { nome, email, password, roleId, filialId, ativo } = data;

  const userToUpdate = await prisma.user.findUnique({ where: { id: Number(id) } });
  if (!userToUpdate) throw new AppError('Usuário não encontrado.', 404);

  const targetRole = roleId ? await prisma.role.findUnique({ where: { id: Number(roleId) } }) : null;
  const invokerUserDb = await prisma.user.findUnique({ where: { id: invokerUser.id }, include: { role: true } });
  const invokerRoleObj = invokerUserDb?.role;

  if (userToUpdate.roleId) {
    const currentUserRole = await prisma.role.findUnique({ where: { id: userToUpdate.roleId } });
    if (currentUserRole?.nome === 'ADM' && invokerRoleObj?.nome !== 'ADM') {
      throw new AppError('Apenas Administradores podem editar perfil ADM.', 403);
    }
  }

  if (targetRole && targetRole.nome === 'ADM' && invokerRoleObj?.nome !== 'ADM') {
    throw new AppError('Acesso Negado: Somente Administradores podem elevar privilégio para ADM.', 403);
  }

  const updateData = {
    nome: nome ? nome.trim() : undefined,
    email: email ? email.trim().toLowerCase() : undefined,
    roleId: roleId ? Number(roleId) : undefined,
    filialId: filialId !== undefined ? (filialId ? Number(filialId) : null) : undefined,
    ativo: ativo !== undefined ? Boolean(ativo) : undefined
  };

  if (password) {
    updateData.password = await bcrypt.hash(password, 10);
  }

  const updatedUser = await prisma.user.update({
    where: { id: Number(id) },
    data: updateData
  });

  // SYNC: Quando filial ou cargo muda, limpa registros antigos da fila da vez
  const filialChanged = filialId !== undefined && Number(filialId) !== userToUpdate.filialId;
  const roleChanged = roleId !== undefined && Number(roleId) !== userToUpdate.roleId;

  if (filialChanged || roleChanged) {
    // Remove TODOS os registros do usuário na fila (de qualquer filial)
    await prisma.salesQueue.deleteMany({
      where: { userId: Number(id) }
    });
    console.log(`[SYNC] Cleaned queue entries for user ${id} (filial changed: ${filialChanged}, role changed: ${roleChanged})`);
  }

  // SYNC: Se o usuário foi desativado, remove da fila também
  if (ativo === false) {
    await prisma.salesQueue.deleteMany({
      where: { userId: Number(id) }
    });
    console.log(`[SYNC] User ${id} deactivated, removed from queue.`);
  }

  return updatedUser;
}

export async function deleteUser(id, invokerUser) {
  const userToDelete = await prisma.user.findUnique({ where: { id: Number(id) }, include: { role: true } });
  if (!userToDelete) throw new AppError('Usuário não encontrado.', 404);

  if (userToDelete.id === invokerUser.id) {
    throw new AppError('Não é possível excluir a própria conta.', 400);
  }

  const invokerUserDb = await prisma.user.findUnique({ where: { id: invokerUser.id }, include: { role: true } });
  const invokerRoleObj = invokerUserDb?.role;

  if (userToDelete.role?.nome === 'ADM' && invokerRoleObj?.nome !== 'ADM') {
    throw new AppError('Acesso Negado: Apenas Administradores podem excluir um ADM.', 403);
  }

  // Limpa registros da fila antes de deletar
  await prisma.salesQueue.deleteMany({
    where: { userId: Number(id) }
  });

  await prisma.user.delete({ where: { id: Number(id) } });
}
