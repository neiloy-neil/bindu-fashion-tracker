import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const incomeFields = [
  'cashSale', 'dueReceived', 'conditionRec', 'bkashIncome', 'nagadIncome',
  'rocketIncome', 'posPubali', 'posCity', 'posBrac', 'posDbbl',
  'acBindu', 'bindu2Transfer', 'receivedAziz1',
] as const

const expenseFields = [
  'advanceTk', 'conditionChange', 'partyPayment', 'aziz2Transfer', 'bankDeposit',
  'dmcb', 'saleBonus', 'courierLbrBill', 'snacksTea', 'lunch', 'conveyance',
  'otherExpense', 'donation', 'stationary', 'netWife', 'utilities', 'waterBill',
  'dailySomity', 'electricRecharge', 'petrolMobil', 'phoneBill', 'shopRent',
  'salary', 'returnExp', 'bkashExpense', 'nagadExpense', 'posExpense',
  'rocketDbbl', 'bossPersonalAll', 'acBinduExpense', 'vat', 'vatExp',
  'emgFund', 'bossGift',
] as const

const digitalExpenseKeys = ['bankDeposit', 'dmcb', 'bkashExpense', 'nagadExpense', 'posExpense', 'rocketDbbl', 'acBinduExpense', 'aziz2Transfer'] as const

const bankTransferKeys = ['bankDeposit', 'dmcb', 'aziz2Transfer', 'returnExp', 'bkashExpense', 'nagadExpense', 'posExpense', 'rocketDbbl', 'acBinduExpense'] as const
const salaryKeys = ['salary', 'saleBonus', 'advanceTk'] as const
const personalKeys = ['bossPersonalAll', 'bossGift', 'netWife'] as const
const taxKeys = ['vat', 'vatExp', 'emgFund'] as const
const opKeys = ['shopRent', 'utilities', 'waterBill', 'electricRecharge', 'phoneBill', 'stationary', 'snacksTea', 'lunch', 'conveyance', 'courierLbrBill', 'petrolMobil'] as const

// Build the _sum object for Prisma
const sumFields: Record<string, boolean> = { openingBalance: true }
incomeFields.forEach(f => sumFields[f] = true)
expenseFields.forEach(f => sumFields[f] = true)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const startDateParam = searchParams.get('startDate')
  const endDateParam = searchParams.get('endDate')

  let startDate: Date
  let endDate: Date

  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
  const branchId = searchParams.get('branchId')

  if (startDateParam && endDateParam) {
    startDate = new Date(startDateParam)
    endDate = new Date(endDateParam)
    endDate.setDate(endDate.getDate() + 1)
  } else {
    startDate = new Date(year, month - 1, 1)
    endDate = new Date(year, month, 1)
  }

  const userRole = req.headers.get('x-user-role')
  const userBranchId = req.headers.get('x-user-branch-id')
  const userManagedBranches = req.headers.get('x-user-managed-branches')

  if (userRole === 'BRANCH' && !userBranchId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const where: Record<string, unknown> = { date: { gte: startDate, lt: endDate } }
  
  if (userRole === 'BRANCH') {
    where.branchId = parseInt(userBranchId!)
  } else if (userRole === 'AREA_MANAGER') {
    if (!userManagedBranches) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const allowedBranchIds = userManagedBranches.split(',').map(id => parseInt(id))
    if (branchId && branchId !== 'all') {
      if (!allowedBranchIds.includes(parseInt(branchId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      where.branchId = parseInt(branchId)
    } else {
      where.branchId = { in: allowedBranchIds }
    }
  } else if (branchId && branchId !== 'all') {
    where.branchId = parseInt(branchId)
  }

  // Optimize: Run aggregations in Postgres instead of pulling all rows into Node.js memory
  const [branchGroups, dailyGroups, branches] = await Promise.all([
    prisma.dailyEntry.groupBy({
      by: ['branchId'],
      where,
      _sum: sumFields as any,
    }),
    prisma.dailyEntry.groupBy({
      by: ['date'],
      where,
      _sum: sumFields as any,
    }),
    prisma.branch.findMany({ select: { id: true, name: true } })
  ])

  const branchNameMap = new Map(branches.map(b => [b.id, b.name]))

  // 1. Process Branch Stats & Overall Totals
  let totalSales = 0
  let totalExpenses = 0
  
  const expenseBreakdown: Record<string, number> = {
    'Bank Transfers': 0,
    'Operating Costs': 0,
    'Salary & Bonus': 0,
    'Personal & Gift': 0,
    'Tax & Fund': 0,
    'Other': 0,
  }

  const branchStats = branchGroups.map(group => {
    const sums: any = group._sum || {}
    
    const entrySale = incomeFields.reduce((s, f) => s + (sums[f] || 0), 0)
    const entryExp = expenseFields.reduce((s, f) => s + (sums[f] || 0), 0)

    totalSales += entrySale
    totalExpenses += entryExp

    // Physical cash logic
    const physicalIn = (sums.cashSale || 0) + (sums.dueReceived || 0) + (sums.conditionRec || 0)
    const physicalOut = expenseFields.reduce((s, f) => s + (digitalExpenseKeys.includes(f as any) ? 0 : (sums[f] || 0)), 0)
    
    // Accumulate Expense Breakdown from all branches
    for (const f of expenseFields) {
      const val = sums[f] || 0
      if (val > 0) {
        if ((bankTransferKeys as readonly string[]).includes(f)) expenseBreakdown['Bank Transfers'] += val
        else if ((salaryKeys as readonly string[]).includes(f)) expenseBreakdown['Salary & Bonus'] += val
        else if ((personalKeys as readonly string[]).includes(f)) expenseBreakdown['Personal & Gift'] += val
        else if ((taxKeys as readonly string[]).includes(f)) expenseBreakdown['Tax & Fund'] += val
        else if ((opKeys as readonly string[]).includes(f)) expenseBreakdown['Operating Costs'] += val
        else expenseBreakdown['Other'] += val
      }
    }

    const openingBalance = sums.openingBalance || 0

    return {
      branchName: branchNameMap.get(group.branchId) || `Branch ${group.branchId}`,
      totalSale: entrySale,
      totalExpense: entryExp,
      openingBalance: openingBalance,
      physicalCashIn: physicalIn,
      physicalCashOut: physicalOut,
      netBalance: openingBalance + entrySale - entryExp,
      physicalCash: openingBalance + physicalIn - physicalOut,
    }
  })

  // 2. Process Daily Trend
  const dailyTrend = dailyGroups.map(group => {
    const sums: any = group._sum || {}
    const entrySale = incomeFields.reduce((s, f) => s + (sums[f] || 0), 0)
    const entryExp = expenseFields.reduce((s, f) => s + (sums[f] || 0), 0)
    
    return {
      date: group.date.toISOString().split('T')[0],
      totalSale: entrySale,
      totalExpense: entryExp,
    }
  }).sort((a, b) => a.date.localeCompare(b.date))

  // 3. Format Expense Breakdown
  const expenseBreakdownArr = Object.entries(expenseBreakdown)
    .filter(([, v]) => v > 0)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)

  return NextResponse.json({
    totalSales,
    totalExpenses,
    netBalance: totalSales - totalExpenses,
    branchStats,
    dailyTrend,
    expenseBreakdown: expenseBreakdownArr,
    month,
    year,
    userRole,
  })
}
