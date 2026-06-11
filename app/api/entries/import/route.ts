import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

const BRANCH_NAMES = [
  'Aziz 1', 'Aziz-2', "Cox's Bazar-1", "Cox's Bazar-2", "Cox's Bazar-3",
  'Basurhat', 'Dorgahgate', 'Lamabazar', 'Barishal', 'Teknaf', 'Jashore',
]

// Map Excel column indices (0-based) to field names
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
  // expense columns start at 18
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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null })

    // Get all branches
    const branches = await prisma.branch.findMany()
    const branchMap = new Map(branches.map((b) => [b.name, b.id]))

    let currentDate: Date | null = null
    let imported = 0
    let skipped = 0
    const errors: string[] = []

    // Data starts at row index 6 (0-based), skipping 6 header rows
    for (let i = 6; i < rows.length; i++) {
      const row = rows[i] as (Date | string | number | null)[]
      if (!row || row.every((c) => c === null)) continue

      // Date is in column 0 when present
      if (row[0] instanceof Date) {
        currentDate = row[0]
      } else if (typeof row[0] === 'string' && row[0].trim()) {
        currentDate = new Date(row[0])
      }

      if (!currentDate) continue

      const branchName = row[1] as string
      if (!branchName || !BRANCH_NAMES.includes(branchName.trim())) continue

      const branchId = branchMap.get(branchName.trim())
      if (!branchId) continue

      const fields: Record<string, number> = {}
      for (const [colIdx, fieldName] of Object.entries(COL_MAP)) {
        const val = row[parseInt(colIdx)]
        fields[fieldName] = typeof val === 'number' ? val : 0
      }

      try {
        await prisma.dailyEntry.upsert({
          where: {
            date_branchId: {
              date: new Date(currentDate.toDateString()),
              branchId,
            },
          },
          create: {
            date: new Date(currentDate.toDateString()),
            branchId,
            ...fields,
          },
          update: fields,
        })
        imported++
      } catch {
        skipped++
        errors.push(`Row ${i + 1}: ${branchName} on ${currentDate.toDateString()}`)
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      errors: errors.slice(0, 10),
    })
  } catch (error: unknown) {
    const e = error as { message?: string }
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
