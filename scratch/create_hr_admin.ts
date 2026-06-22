import { prisma } from '../lib/prisma'
import * as bcrypt from 'bcryptjs'

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10)
  
  await prisma.user.upsert({
    where: { username: 'hr_admin_test' },
    update: { email: 'hr@bindu.com', role: 'HR_ADMIN', passwordHash },
    create: {
      username: 'hr_admin_test',
      email: 'hr@bindu.com',
      passwordHash,
      role: 'HR_ADMIN',
    }
  })
  console.log('HR_ADMIN created! username: hr_admin_test, email: hr@bindu.com, password: password123')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
