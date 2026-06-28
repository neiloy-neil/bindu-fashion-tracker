import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  if (!role || !['ADMIN', 'SUPER_ADMIN', 'AUDITOR', 'AREA_MANAGER'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const month = parseInt(searchParams.get('month') || '')
  const year = parseInt(searchParams.get('year') || '')
  const branchId = searchParams.get('branchId')

  if (isNaN(month) || isNaN(year)) {
    return NextResponse.json({ error: 'Invalid month or year' }, { status: 400 })
  }

  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59, 999)

  try {
    const [branches, entries] = await Promise.all([
      prisma.branch.findMany({
        where: branchId ? { id: parseInt(branchId) } : {},
        select: { id: true, name: true },
      }),
      prisma.dailyEntry.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          ...(branchId ? { branchId: parseInt(branchId) } : {})
        },
        select: {
          branchId: true,
          // Only pull income items, filtered at DB level — excludes Opening Balance
          items: {
            where: { category: { type: 'INCOME', name: { not: 'Opening Balance' } } },
            select: { amount: true },
          },
          expenseEntries: { select: { amount: true } },
          transfers: { select: { amount: true } },
          payments: { select: { amount: true } },
          advanceSalaries: { select: { amount: true, type: true } },
        },
      }),
    ])

    // Group by branch
    const branchData = branches.map(b => {
      const branchEntries = entries.filter(e => e.branchId === b.id)

      let totalIncome = 0
      let totalExpense = 0
      let totalTransfers = 0
      let totalPayments = 0
      let totalAdvances = 0

      branchEntries.forEach(entry => {
        totalIncome += entry.items.reduce((sum, item) => sum + item.amount, 0)
        totalExpense += entry.expenseEntries.reduce((sum, exp) => sum + exp.amount, 0)
        totalTransfers += entry.transfers.reduce((sum, tr) => sum + tr.amount, 0)
        totalPayments += entry.payments.reduce((sum, p) => sum + p.amount, 0)
        totalAdvances += entry.advanceSalaries.filter(a => a.type === 'CASH').reduce((sum, a) => sum + (a.amount ?? 0), 0)
      })

      return {
        branchId: b.id,
        branchName: b.name,
        totalIncome,
        totalExpense,
        totalTransfers,
        totalPayments,
        totalAdvances,
        netCashFlow: totalIncome - totalExpense - totalTransfers - totalPayments - totalAdvances
      }
    })

    return NextResponse.json(branchData)
  } catch (error: any) {
    console.error('Monthly report error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
