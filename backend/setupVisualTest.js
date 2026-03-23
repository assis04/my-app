import prisma from './src/config/prisma.js';
import bcrypt from 'bcryptjs';

async function createTestUsers() {
  try {
    const password = await bcrypt.hash('test1234', 10);
    const filialId = 8;
    const roleId = 5;
    const emails = ['testv1@example.com', 'testv2@example.com', 'testv3@example.com'];
    
    for (const email of emails) {
      const user = await prisma.user.upsert({
        where: { email },
        update: { password: password, ativo: true, filialId: filialId, roleId: roleId },
        create: {
          nome: email.split('@')[0].toUpperCase(),
          email: email,
          password: password,
          ativo: true,
          filialId: filialId,
          roleId: roleId
        }
      });
      await prisma.salesQueue.upsert({
        where: { filialId_userId: { filialId: filialId, userId: user.id } },
        update: { isAvailable: true },
        create: { filialId: filialId, userId: user.id, isAvailable: true, position: 0 }
      });
    }
    
    // reset positions
    const queue = await prisma.salesQueue.findMany({
      where: { filialId: filialId },
      orderBy: { userId: 'asc' }
    });
    for (let i = 0; i < queue.length; i++) {
      await prisma.salesQueue.update({
        where: { filialId_userId: { filialId: filialId, userId: queue[i].userId } },
        data: { position: i + 1 }
      });
    }
    
    console.log('✅ Users recreated and positions reset.');
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}
createTestUsers();
