import bcrypt from "bcryptjs";
import prisma from '../config/prisma.js';
import AppError from '../utils/AppError.js';

export async function findUserByEmail(email) {
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase().trim(), deletedAt: null },
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

export async function listUsers({ page = 1, limit = 100 } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const take = Math.min(500, Math.max(1, parseInt(limit, 10) || 100));
  const skip = (pageNum - 1) * take;

  const where = { deletedAt: null };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { nome: 'asc' },
      select: {
        id: true,
        nome: true,
        email: true,
        ativo: true,
        role: { select: { id: true, nome: true } },
        filial: { select: { id: true, nome: true } }
      },
      skip,
      take,
    }),
    prisma.user.count({ where }),
  ]);

  const data = users.map(u => ({
    id: u.id,
    nome: u.nome,
    email: u.email,
    ativo: u.ativo,
    roleId: u.role?.id,
    perfil: u.role?.nome || 'Sem Perfil',
    filialId: u.filial?.id,
    filial: u.filial?.nome || '-'
  }));

  return { data, total, page: pageNum, limit: take, totalPages: Math.ceil(total / take) };
}

export async function updateUser(id, data, invokerUser) {
  const { nome, email, password, roleId, filialId, ativo } = data;
  const numId = Number(id);

  const userToUpdate = await prisma.user.findUnique({ where: { id: numId } });
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

  return prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: numId },
      data: updateData
    });

    // SYNC: Quando filial ou cargo muda, limpa registros antigos da fila da vez
    const filialChanged = filialId !== undefined && Number(filialId) !== userToUpdate.filialId;
    const roleChanged = roleId !== undefined && Number(roleId) !== userToUpdate.roleId;

    if (filialChanged || roleChanged) {
      await tx.salesQueue.deleteMany({ where: { userId: numId } });
    }

    // SYNC: Se o usuário foi desativado, remove da fila também
    if (ativo === false) {
      await tx.salesQueue.deleteMany({ where: { userId: numId } });
    }

    return updatedUser;
  });
}

export async function deleteUser(id, invokerUser) {
  const numId = Number(id);
  const userToDelete = await prisma.user.findUnique({ where: { id: numId, deletedAt: null }, include: { role: true } });
  if (!userToDelete) throw new AppError('Usuário não encontrado.', 404);

  if (userToDelete.id === invokerUser.id) {
    throw new AppError('Não é possível excluir a própria conta.', 400);
  }

  const invokerUserDb = await prisma.user.findUnique({ where: { id: invokerUser.id }, include: { role: true } });
  const invokerRoleObj = invokerUserDb?.role;

  if (userToDelete.role?.nome === 'ADM' && invokerRoleObj?.nome !== 'ADM') {
    throw new AppError('Acesso Negado: Apenas Administradores podem excluir um ADM.', 403);
  }

  return prisma.$transaction(async (tx) => {
    await tx.salesQueue.deleteMany({ where: { userId: numId } });
    await tx.user.update({
      where: { id: numId },
      data: { deletedAt: new Date(), ativo: false },
    });
  });
}
