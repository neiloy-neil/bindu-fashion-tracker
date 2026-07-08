/**
 * One-time script: tag existing categories with applicableTo branch types.
 * Run with: npx tsx scripts/tag-categories.ts
 *
 * Rules:
 * - POS / mobile-banking income categories → RETAIL only
 * - System/transfer categories → ALL (empty array, shows everywhere)
 * - General expense categories (rent, salary, utilities) → ALL
 * - Clearly retail-only expenses → RETAIL
 */

import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter } as any)

const RETAIL_INCOME_KEYWORDS = [
  'cash sale', 'bkash sale', 'nagad income', 'rocket income',
  'pos brac', 'pos city', 'pos dbbl', 'pos pubali', 'pos trust',
  'bkash', 'nagad', 'rocket', 'upay', 'due received', 'condition rec',
]

const SYSTEM_ALL_KEYWORDS = [
  'opening balance', 'branch transfer received', 'a/c bindu',
  'bindu-2 transfer', 'received aziz', 'transfer',
]

async function main() {
  const categories = await prisma.category.findMany({
    select: { id: true, name: true, type: true, applicableTo: true },
  })

  console.log(`Found ${categories.length} categories`)

  const updates: { id: number; name: string; applicableTo: string[] }[] = []

  for (const cat of categories) {
    // Skip if already tagged
    if (cat.applicableTo.length > 0) {
      console.log(`  SKIP (already tagged): ${cat.name} → [${cat.applicableTo.join(', ')}]`)
      continue
    }

    const lower = cat.name.toLowerCase()

    const isSystemAll = SYSTEM_ALL_KEYWORDS.some(k => lower.includes(k))
    if (isSystemAll) {
      console.log(`  ALL: ${cat.name}`)
      continue // leave as empty = all branches
    }

    if (cat.type === 'INCOME') {
      const isRetailIncome = RETAIL_INCOME_KEYWORDS.some(k => lower.includes(k))
      if (isRetailIncome) {
        updates.push({ id: cat.id, name: cat.name, applicableTo: ['RETAIL'] })
        console.log(`  RETAIL income: ${cat.name}`)
        continue
      }
    }

    if (cat.type === 'EXPENSE') {
      const RETAIL_EXPENSE_KEYWORDS = [
        'display', 'decoration', 'bag', 'hanger', 'packaging',
        'pos machine', 'card machine',
      ]
      const isRetailExpense = RETAIL_EXPENSE_KEYWORDS.some(k => lower.includes(k))
      if (isRetailExpense) {
        updates.push({ id: cat.id, name: cat.name, applicableTo: ['RETAIL'] })
        console.log(`  RETAIL expense: ${cat.name}`)
        continue
      }
    }

    // Default: leave as ALL (empty)
    console.log(`  ALL (default): ${cat.name}`)
  }

  console.log(`\nApplying ${updates.length} updates…`)

  for (const u of updates) {
    await prisma.category.update({
      where: { id: u.id },
      data: { applicableTo: u.applicableTo },
    })
    console.log(`  Updated: ${u.name} → [${u.applicableTo.join(', ')}]`)
  }

  console.log('\nDone.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
