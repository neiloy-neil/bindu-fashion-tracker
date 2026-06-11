import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import path from 'path'

const adapter = new PrismaLibSql({
  url: 'file:./prisma/dev.db',
})
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any)

const BRANCHES = [
  { name: 'Aziz 1',       code: 'AZIZ1' },
  { name: 'Aziz-2',       code: 'AZIZ2' },
  { name: "Cox's Bazar-1", code: 'COX1' },
  { name: "Cox's Bazar-2", code: 'COX2' },
  { name: "Cox's Bazar-3", code: 'COX3' },
  { name: 'Basurhat',     code: 'BASURHAT' },
  { name: 'Dorgahgate',   code: 'DORGAHGATE' },
  { name: 'Lamabazar',    code: 'LAMABAZAR' },
  { name: 'Barishal',     code: 'BARISHAL' },
  { name: 'Teknaf',       code: 'TEKNAF' },
  { name: 'Jashore',      code: 'JASHORE' },
]

async function main() {
  console.log('🌱 Seeding branches...')
  for (const branch of BRANCHES) {
    await prisma.branch.upsert({
      where: { code: branch.code },
      update: {},
      create: branch,
    })
  }
  console.log(`✅ Seeded ${BRANCHES.length} branches.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
