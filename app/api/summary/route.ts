import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    // Add one day to include the entire end date in the query
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

  const [entries, branches] = await Promise.all([
    prisma.dailyEntry.findMany({
      where,
      select: {
        id: true,
        date: true,
        branchId: true,
        items: { select: { amount: true, category: { select: { name: true, type: true } } } },
        transfers: { select: { amount: true } },
        receivedTransfers: { select: { amount: true } },
        payments: { select: { amount: true, method: true, cheque: { select: { status: true } } } },
        expenseEntries: { select: { amount: true, category: { select: { name: true } } } },
        advanceSalaries: { select: { type: true, amount: true } }
      }
    }),
    prisma.branch.findMany({ select: { id: true, name: true } })
  ])

  const branchNameMap = new Map(branches.map(b => [b.id, b.name]))

  let totalSales = 0
  let totalExpenses = 0
  const expenseBreakdown: Record<string, number> = {}

  // For branch stats
  const branchStatsMap = new Map<number, any>()

  // For daily trend
  const dailyTrendMap = new Map<string, any>()
  
  const isDigital = (name: string) => /bank|bkash|nagad|pos|rocket|dbbl|transfer/i.test(name)

  for (const entry of entries) {
    let entrySale = 0
    let entryExp = 0
    let physicalIn = 0
    let physicalOut = 0
    let openingBalance = 0

    const dateStr = entry.date.toISOString().split('T')[0]

    for (const item of entry.items) {
      if (item.category.name === 'Opening Balance') {
        openingBalance += item.amount
      } else if (item.category.type === 'INCOME') {
        entrySale += item.amount
        if (!isDigital(item.category.name)) physicalIn += item.amount
      } else if (item.category.type === 'EXPENSE') {
        entryExp += item.amount
        if (!isDigital(item.category.name)) physicalOut += item.amount
        
        const catName = item.category.name
        expenseBreakdown[catName] = (expenseBreakdown[catName] || 0) + item.amount
      }
    }

    if (entry.transfers) {
      for (const t of entry.transfers) {
        entryExp += t.amount
        physicalOut += t.amount
        expenseBreakdown['Transfers'] = (expenseBreakdown['Transfers'] || 0) + t.amount
      }
    }
    
    if (entry.receivedTransfers) {
      for (const t of entry.receivedTransfers) {
        entrySale += t.amount
        physicalIn += t.amount
      }
    }
    
    if (entry.payments) {
      for (const p of entry.payments) {
        if (p.method === 'CHEQUE' && p.cheque?.status !== 'APPROVED') continue
        entryExp += p.amount
        if (p.method === 'CASH') physicalOut += p.amount
        expenseBreakdown['Party Payments'] = (expenseBreakdown['Party Payments'] || 0) + p.amount
      }
    }

    if (entry.expenseEntries) {
      for (const e of entry.expenseEntries) {
        entryExp += e.amount
        physicalOut += e.amount
        const catName = e.category?.name || 'Other Expense'
        expenseBreakdown[catName] = (expenseBreakdown[catName] || 0) + e.amount
      }
    }

    if (entry.advanceSalaries) {
      for (const a of entry.advanceSalaries) {
        if (a.type === 'CASH') {
          const amt = a.amount || 0
          entryExp += amt
          physicalOut += amt
          expenseBreakdown['Advance Salary'] = (expenseBreakdown['Advance Salary'] || 0) + amt
        }
      }
    }

    totalSales += entrySale
    totalExpenses += entryExp

    // Branch stats
    if (!branchStatsMap.has(entry.branchId)) {
      branchStatsMap.set(entry.branchId, {
        branchName: branchNameMap.get(entry.branchId) || `Branch ${entry.branchId}`,
        totalSale: 0,
        totalExpense: 0,
        openingBalance: 0,
        physicalCashIn: 0,
        physicalCashOut: 0,
        netBalance: 0,
        physicalCash: 0,
      })
    }

    const bStat = branchStatsMap.get(entry.branchId)
    bStat.totalSale += entrySale
    bStat.totalExpense += entryExp
    bStat.openingBalance += openingBalance
    bStat.physicalCashIn += physicalIn
    bStat.physicalCashOut += physicalOut
    
    // Instead of using pure accumulation of opening balances for net balance, we just use the daily computed net.
    // The previous implementation used openingBalance + entrySale - entryExp for a day, but across a month, 
    // simply summing the opening balances of every day is wrong!
    // It should be Net Balance = Total Income - Total Expense.
    bStat.netBalance += (entrySale - entryExp)
    
    // Physical cash sum across the month is also flawed if we sum daily opening balances.
    // Instead, just report total physical in minus total physical out over the period.
    bStat.physicalCash += (physicalIn - physicalOut)

    // Daily trend
    if (!dailyTrendMap.has(dateStr)) {
      dailyTrendMap.set(dateStr, {
        date: dateStr,
        totalSale: 0,
        totalExpense: 0,
      })
    }
    const dTrend = dailyTrendMap.get(dateStr)
    dTrend.totalSale += entrySale
    dTrend.totalExpense += entryExp
  }

  const branchStats = Array.from(branchStatsMap.values())
  const dailyTrend = Array.from(dailyTrendMap.values()).sort((a, b) => a.date.localeCompare(b.date))

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
