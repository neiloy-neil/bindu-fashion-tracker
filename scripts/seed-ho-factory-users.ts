import 'dotenv/config'
import { prisma } from '../lib/prisma'
import * as bcrypt from 'bcryptjs'

async function main() {
  const hoHash = await bcrypt.hash('ho123', 10)
  const factoryHash = await bcrypt.hash('factory123', 10)

  const hoBranch = await prisma.branch.findUnique({ where: { code: 'HO' } })
  const factoryBranch = await prisma.branch.findUnique({ where: { code: 'DOTFASHION' } })

  if (!hoBranch) throw new Error('Head Office branch not found')
  if (!factoryBranch) throw new Error('Dot Fashion branch not found')

  const hoUser = await prisma.user.upsert({
    where: { username: 'headoffice' },
    update: {},
    create: {
      username: 'headoffice',
      passwordHash: hoHash,
      role: 'BRANCH',
      branchId: hoBranch.id,
      isActive: true,
    },
  })
  console.log(`✅ User: ${hoUser.username} → ${hoBranch.name}`)

  const factoryUser = await prisma.user.upsert({
    where: { username: 'dotfashion' },
    update: {},
    create: {
      username: 'dotfashion',
      passwordHash: factoryHash,
      role: 'BRANCH',
      branchId: factoryBranch.id,
      isActive: true,
    },
  })
  console.log(`✅ User: ${factoryUser.username} → ${factoryBranch.name}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
