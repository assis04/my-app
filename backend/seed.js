/**
 * Seed Script - Cria o role ADM e o usuário Administrador inicial
 * Execute com: node seed.js
 */
import prisma from './src/config/prisma.js';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Iniciando seed...\n');

  // 1. Criar o Role ADM com permissão total (curinga *)
  const admRole = await prisma.role.upsert({
    where: { nome: 'ADM' },
    update: { permissions: ['*'] },
    create: {
      nome: 'ADM',
      descricao: 'Administrador do sistema com acesso total.',
      permissions: ['*'],
    },
  });
  console.log(`✅ Role criado: ${admRole.nome} (ID: ${admRole.id})`);

  // 2. Criar outras roles básicas
  const otherRoles = [
    { nome: 'RH',      descricao: 'Recursos Humanos', permissions: ['rh:usuarios:read','rh:usuarios:create','rh:usuarios:update','rh:usuarios:delete','rh:perfis:read','rh:perfis:create','rh:perfis:update','rh:equipes:read','rh:equipes:manage','notifications:send:all','notifications:receive:all','agenda:manage:all'] },
    { nome: 'GERENTE', descricao: 'Gerente de Filial',  permissions: ['leads:read:branch','leads:create:branch','leads:update:branch','leads:delete:branch','kanban:read:branch','kanban:update:branch','tasks:manage:branch','reports:read:branch','notifications:send:all','notifications:receive:all','agenda:manage:all'] },
    { nome: 'VENDEDOR',descricao: 'Vendedor',           permissions: ['leads:read:own','leads:create:own','leads:update:own','leads:delete:own','kanban:read:own','kanban:update:own','tasks:manage:own','reports:read:own','notifications:send:all','notifications:receive:all','agenda:manage:all'] },
    { nome: 'SDR',     descricao: 'Sales Dev Representative', permissions: ['leads:read:all','leads:create:all','leads:update:all','kanban:read:all','kanban:update:all','tasks:manage:own','notifications:send:all','notifications:receive:all','agenda:manage:all'] },
    { nome: 'CAPTACAO',descricao: 'Captação',            permissions: ['leads:read:all','tasks:manage:own','notifications:send:all','notifications:receive:all','agenda:manage:all'] },
  ];

  for (const role of otherRoles) {
    const r = await prisma.role.upsert({
      where: { nome: role.nome },
      update: { permissions: role.permissions },
      create: role,
    });
    console.log(`✅ Role criado: ${r.nome} (ID: ${r.id})`);
  }

  // 3. Criar usuário Administrador
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;
  if (!adminPassword) {
    console.error('❌ ADMIN_SEED_PASSWORD não definida. Defina a variável de ambiente antes de rodar o seed.');
    process.exit(1);
  }

  if (adminPassword.length < 8) {
    console.error('❌ ADMIN_SEED_PASSWORD deve ter pelo menos 8 caracteres.');
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@ambisistem.com' },
    update: {},
    create: {
      nome: 'Administrador',
      email: 'admin@ambisistem.com',
      password: hashedPassword,
      roleId: admRole.id,
    },
  });

  console.log(`\n✅ Usuário Admin criado (ID: ${adminUser.id})`);
  console.log(`   📧 Email: admin@ambisistem.com`);
  console.log('\n🌱 Seed concluído com sucesso!');
}

seed()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
