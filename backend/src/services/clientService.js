import prisma from "../config/prisma.js";

export async function createClient(data) {
  return prisma.client.create({
    data: {
      nome: data.nome,
      email: data.email,
      telefone: data.telefone,
      endereco: data.endereco,
      cpf_cnpj: data.cpf_cnpj,
      userId: data.userId ? parseInt(data.userId) : null,
      filialId: data.filialId ? parseInt(data.filialId) : null,
    },
  });
}

export async function findClientById(id) {
  return prisma.client.findUnique({
    where: { id: parseInt(id) },
    include: {
      user: {
        select: { nome: true, email: true },
      },
    },
  });
}

export async function listClients(user, filters = {}) {
  // RLS (Row Level Security) Logic em nível de aplicação
  if (user) {
    if (user.role?.nome === "Vendedor") {
      // Vendedor: Acesso apenas à sua própria filial (ou somente aos seus clientes, pendente regra exata.
      // Por solicitação "Acesso apenas aos dados da sua filial")
      filters.filialId = user.filialId;
    } else if (user.role?.nome === "Gerente") {
      // Gerente: Acesso à sua filial
      filters.filialId = user.filialId;
    } else if (user.role?.nome === "ADM" || user.role?.nome === "SDR") {
      // ADM e SDR: Acesso a todas filiais, não aplica filtro de filialId
    }
  }

  return prisma.client.findMany({
    where: filters,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { nome: true },
      },
      filial: {
        select: { nome: true },
      },
    },
  });
}

export async function updateClient(id, data) {
  return prisma.client.update({
    where: { id: parseInt(id) },
    data,
  });
}

export async function deleteClient(id) {
  return prisma.client.delete({
    where: { id: parseInt(id) },
  });
}
