/**
 * Direct Excel import script - bypasses HTTP upload
 * Run with: npx ts-node scripts/import-excel.ts
 */
import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createRequire } from 'module'
import * as fs from 'fs'

const require = createRequire(import.meta.url)
const XLSX = require('xlsx') as typeof import('xlsx')

const adapter = new PrismaLibSql({ url: 'file:./prisma/dev.db' })
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any)

const BRANCH_NAMES = [
  'Aziz 1', 'Aziz-2', "Cox's Bazar-1", "Cox's Bazar-2", "Cox's Bazar-3",
  'Basurhat', 'Dorgahgate', 'Lamabazar', 'Barishal', 'Teknaf', 'Jashore',
]

const COL_MAP: Record<number, string> = {
  2: 'openingBalance',
  3: 'cashSale',
  4: 'dueReceived',
  5: 'conditionRec',
  6: 'bkashIncome',
  7: 'nagadIncome',
  8: 'rocketIncome',
  9: 'posPubali',
  10: 'posCity',
  11: 'posBrac',
  12: 'posDbbl',
  13: 'acBindu',
  14: 'bindu2Transfer',
  15: 'receivedAziz1',
  18: 'advanceTk',
  19: 'conditionChange',
  20: 'partyPayment',
  21: 'aziz2Transfer',
  22: 'bankDeposit',
  23: 'dmcb',
  24: 'saleBonus',
  25: 'courierLbrBill',
  26: 'snacksTea',
  27: 'lunch',
  28: 'conveyance',
  29: 'otherExpense',
  30: 'donation',
  31: 'stationary',
  32: 'netWife',
  33: 'utilities',
  34: 'waterBill',
  35: 'dailySomity',
  36: 'electricRecharge',
  37: 'petrolMobil',
  38: 'phoneBill',
  39: 'shopRent',
  40: 'salary',
  41: 'returnExp',
  42: 'bkashExpense',
  43: 'nagadExpense',
  44: 'posExpense',
  45: 'rocketDbbl',
  46: 'bossPersonalAll',
  47: 'acBinduExpense',
  48: 'vat',
  49: 'vatExp',
  50: 'emgFund',
  51: 'bossGift',
}

async function main() {
  const filePath = process.argv[2] || 'C:\\Users\\USER\\Downloads\\Monthly Sales, Expenses & Payments Sheet 2026.xlsx'

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
    process.exit(1)
  }

  console.log(`📂 Reading: ${filePath}`)
  const wb = XLSX.readFile(filePath, { cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null })

  const branches = await prisma.branch.findMany()
  const branchMap = new Map(branches.map((b) => [b.name, b.id]))

  let currentDate: Date | null = null
  let imported = 0
  let skipped = 0

  for (let i = 6; i < rows.length; i++) {
    const row = rows[i] as (Date | string | number | null)[]
    if (!row || row.every((c) => c === null)) continue

    if (row[0] instanceof Date) {
      currentDate = row[0]
    } else if (typeof row[0] === 'string' && row[0].trim()) {
      const parsed = new Date(row[0])
      if (!isNaN(parsed.getTime())) currentDate = parsed
    }

    if (!currentDate) continue

    const branchName = (row[1] as string)?.trim()
    if (!branchName || !BRANCH_NAMES.includes(branchName)) continue

    const branchId = branchMap.get(branchName)
    if (!branchId) continue

    const fields: Record<string, number> = {}
    for (const [colIdx, fieldName] of Object.entries(COL_MAP)) {
      const val = row[parseInt(colIdx)]
      fields[fieldName] = typeof val === 'number' ? val : 0
    }

    // Normalize date to midnight UTC
    const entryDate = new Date(currentDate)
    entryDate.setHours(0, 0, 0, 0)

    try {
      await prisma.dailyEntry.upsert({
        where: { date_branchId: { date: entryDate, branchId } },
        create: { date: entryDate, branchId, ...fields },
        update: fields,
      })
      imported++
      if (imported % 50 === 0) process.stdout.write(`  ✓ ${imported} rows imported...\r`)
    } catch (e) {
      skipped++
      if (skipped <= 5) console.error(`  ✗ Row ${i + 1} ${branchName}: ${(e as Error).message}`)
    }
  }

  console.log(`\n✅ Done! Imported: ${imported}, Skipped: ${skipped}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
