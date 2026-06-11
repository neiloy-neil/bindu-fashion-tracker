import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const adapter = new PrismaLibSql({ url: 'file:./prisma/dev.db' })
const prisma = new PrismaClient({ adapter } as any)

async function main() {
  const entry = await prisma.dailyEntry.findFirst({ 
    where: { cashSale: { gt: 0 } },
    include: { branch: true }
  })
  if (entry) {
    console.log('Sample entry with cashSale > 0:')
    console.log(JSON.stringify(entry, null, 2))
  } else {
    // show any entry
    const anyEntry = await prisma.dailyEntry.findFirst({ include: { branch: true } })
    console.log('Any entry:')
    console.log(JSON.stringify(anyEntry, null, 2))
  }
}
main().catch(console.error).finally(() => prisma.$disconnect())
