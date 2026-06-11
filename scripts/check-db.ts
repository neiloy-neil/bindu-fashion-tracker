import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const adapter = new PrismaLibSql({ url: 'file:./prisma/dev.db' })
const prisma = new PrismaClient({ adapter } as any)

async function main() {
  const count = await prisma.dailyEntry.count()
  const first3 = await prisma.dailyEntry.findMany({ 
    take: 3, 
    orderBy: { date: 'asc' },
    include: { branch: { select: { name: true } } }
  })
  console.log(`Total entries: ${count}`)
  for (const r of first3) {
    console.log(`  ${r.date.toISOString()} | ${r.branch.name} | cashSale=${r.cashSale}`)
  }
}
main().catch(console.error).finally(() => prisma.$disconnect())
