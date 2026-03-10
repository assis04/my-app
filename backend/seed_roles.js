import prisma from './src/config/prisma.js';

async function main() {
  const roles = [
    { id: 1, nome: 'Vendedor', descricao: 'Acesso às vendas e clientes' },
    { id: 2, nome: 'Gerente', descricao: 'Acesso total a relatórios e gestão' },
    { id: 3, nome: 'Administrador', descricao: 'Acesso completo ao sistema' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { id: role.id },
      update: {},
      create: role,
    });
  }

  console.log('Roles populadas com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
