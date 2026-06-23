/**
 * Direct Excel import script - bypasses HTTP upload
 * Run with: npx ts-node scripts/import-excel.ts
 */
import ExcelJS from 'exceljs'
import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import * as fs from 'fs'

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

function getCellValue(cell: ExcelJS.Cell['value']) {
  if (cell == null) return null
  if (typeof cell === 'object') {
    if ('result' in cell && cell.result != null) return cell.result
    if ('text' in cell && typeof cell.text === 'string') return cell.text
  }
  return cell
}

function getNumericValue(cell: ExcelJS.Cell['value']) {
  const value = getCellValue(cell)
  return typeof value === 'number' ? value : 0
}

function getDateValue(cell: ExcelJS.Cell['value']) {
  const value = getCellValue(cell)
  if (value instanceof Date) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
  }
  return null
}

async function main() {
  const filePath = process.argv[2] || 'C:\\Users\\USER\\Downloads\\Monthly Sales, Expenses & Payments Sheet 2026.xlsx'

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
    process.exit(1)
  }

  console.log(`Reading: ${filePath}`)
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filePath)
  const worksheet = workbook.worksheets[0]

  if (!worksheet) {
    throw new Error('No worksheet found in workbook')
  }

  const branches = await prisma.branch.findMany()
  const branchMap = new Map(branches.map((branch) => [branch.name, branch.id]))

  let currentDate: Date | null = null
  let imported = 0
  let skipped = 0

  for (let rowIndex = 7; rowIndex <= worksheet.rowCount; rowIndex++) {
    const row = worksheet.getRow(rowIndex)
    const firstCellDate = getDateValue(row.getCell(1).value)
    if (firstCellDate) {
      currentDate = firstCellDate
    }

    if (!currentDate) {
      continue
    }

    const branchName = String(getCellValue(row.getCell(2).value) ?? '').trim()
    if (!branchName || !BRANCH_NAMES.includes(branchName)) {
      continue
    }

    const branchId = branchMap.get(branchName)
    if (!branchId) {
      continue
    }

    const fields: Record<string, number> = {}
    for (const [colIndex, fieldName] of Object.entries(COL_MAP)) {
      fields[fieldName] = getNumericValue(row.getCell(Number(colIndex)).value)
    }

    const entryDate = new Date(currentDate)
    entryDate.setHours(0, 0, 0, 0)

    try {
      await prisma.dailyEntry.upsert({
        where: { date_branchId: { date: entryDate, branchId } },
        create: { date: entryDate, branchId, ...fields },
        update: fields,
      })
      imported++
      if (imported % 50 === 0) {
        process.stdout.write(`  imported ${imported} rows...\r`)
      }
    } catch (error) {
      skipped++
      if (skipped <= 5) {
        console.error(`  Row ${rowIndex} ${branchName}: ${(error as Error).message}`)
      }
    }
  }

  console.log(`Done. Imported: ${imported}, Skipped: ${skipped}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
