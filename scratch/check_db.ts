import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.count()
  const branches = await prisma.branch.count()
  const categories = await prisma.category.count()
  const settings = await prisma.systemSettings.count()

  console.log(`Users: ${users}`)
  console.log(`Branches: ${branches}`)
  console.log(`Categories: ${categories}`)
  console.log(`Settings: ${settings}`)

  if (users > 0) {
    const adminUser = await prisma.user.findUnique({ where: { username: 'admin' } })
    console.log(`Admin User: ${adminUser ? 'Found' : 'Missing'}`)
    const hrAdminUser = await prisma.user.findUnique({ where: { username: 'hr_admin' } })
    console.log(`HR Admin User: ${hrAdminUser ? 'Found' : 'Missing'}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
