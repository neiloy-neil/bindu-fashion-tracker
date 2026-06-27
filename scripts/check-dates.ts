import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter } as any)

async function main() {
  const entries = await prisma.dailyEntry.findMany({ 
    select: { date: true },
    distinct: ['date'],
    orderBy: { date: 'asc' }
  })
  console.log(`Distinct dates:`)
  for (const e of entries) {
    const d = e.date
    console.log(`  ISO: ${d.toISOString()} | Local: ${d.toLocaleDateString()} | Month: ${d.getMonth()+1}/${d.getFullYear()}`)
  }
}
main().catch(console.error).finally(() => prisma.$disconnect())
