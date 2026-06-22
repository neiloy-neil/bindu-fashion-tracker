const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function test() {
  const existing = await prisma.user.findFirst({ where: { role: 'HR_ADMIN' }});
  if (existing) {
    console.log("HR_ADMIN already exists:", existing.username);
    return;
  }
  
  const hash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.create({
    data: {
      username: 'hr_test',
      email: 'hr@example.com',
      passwordHash: hash,
      role: 'HR_ADMIN',
      isActive: true
    }
  });
  console.log('Created HR_ADMIN:', user.username, 'Email:', user.email);
}
test().catch(console.error).finally(() => prisma.$disconnect());
