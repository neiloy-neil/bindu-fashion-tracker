import 'dotenv/config'
import { prisma } from '../lib/prisma'

async function main() {
  const headOffice = await prisma.branch.upsert({
    where: { code: 'HO' },
    update: {},
    create: {
      name: 'Head Office',
      code: 'HO',
      type: 'HEAD_OFFICE',
      isActive: true,
    },
  })
  console.log(`✅ Branch: ${headOffice.name} (${headOffice.type})`)

  const factory = await prisma.branch.upsert({
    where: { code: 'DOTFASHION' },
    update: {},
    create: {
      name: 'Dot Fashion',
      code: 'DOTFASHION',
      type: 'FACTORY',
      isActive: true,
    },
  })
  console.log(`✅ Branch: ${factory.name} (${factory.type})`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
