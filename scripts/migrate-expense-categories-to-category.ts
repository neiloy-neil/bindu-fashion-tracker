/**
 * One-time migration: copy ExpenseCategory → Category (type=EXPENSE) and remap ExpenseEntry.categoryId.
 * Run BEFORE prisma db push that drops the ExpenseCategory table.
 */
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter } as any)

async function main() {
  // 1. Read all existing expense categories using raw SQL (safer than Prisma model which may be removed)
  const expenseCategories = await prisma.$queryRaw<
    { id: number; name: string; frequency: string; isActive: boolean }[]
  >`SELECT id, name, frequency, "isActive" FROM "ExpenseCategory" ORDER BY id`

  if (expenseCategories.length === 0) {
    console.log('No ExpenseCategory records found — nothing to migrate.')
    return
  }

  console.log(`Found ${expenseCategories.length} ExpenseCategory records to migrate.`)

  const idMap: Record<number, number> = {}

  for (const ec of expenseCategories) {
    // Check if a Category with this name already exists
    const existing = await prisma.category.findUnique({ where: { name: ec.name } })

    if (existing) {
      // Update it to have the frequency and ensure type=EXPENSE
      await prisma.category.update({
        where: { id: existing.id },
        data: { type: 'EXPENSE', frequency: ec.frequency, isActive: ec.isActive },
      })
      idMap[ec.id] = existing.id
      console.log(`  Mapped existing Category "${ec.name}" (id=${existing.id}) ← ExpenseCategory id=${ec.id}`)
    } else {
      const newCat = await (prisma.category.create as any)({
        data: {
          name: ec.name,
          type: 'EXPENSE',
          isActive: ec.isActive,
          frequency: ec.frequency,
          isDefault: false,
        },
      })
      idMap[ec.id] = newCat.id
      console.log(`  Created Category "${ec.name}" (id=${newCat.id}) ← ExpenseCategory id=${ec.id}`)
    }
  }

  // 2. Drop the FK constraint temporarily so we can remap categoryId values
  await prisma.$executeRaw`ALTER TABLE "ExpenseEntry" DROP CONSTRAINT IF EXISTS "ExpenseEntry_categoryId_fkey"`
  console.log('\nDropped FK constraint on ExpenseEntry.categoryId')

  // 3. Remap ExpenseEntry.categoryId from ExpenseCategory IDs to Category IDs
  let remapped = 0
  for (const [oldId, newId] of Object.entries(idMap)) {
    const result = await prisma.$executeRaw`
      UPDATE "ExpenseEntry" SET "categoryId" = ${newId} WHERE "categoryId" = ${parseInt(oldId)}
    `
    remapped += Number(result)
  }

  console.log(`Remapped ${remapped} ExpenseEntry rows.`)
  console.log('ID mapping (ExpenseCategory.id → Category.id):', idMap)
  console.log('\nMigration complete. Now run: npx prisma db push --accept-data-loss')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
