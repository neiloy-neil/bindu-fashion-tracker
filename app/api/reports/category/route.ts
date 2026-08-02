import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  if (!role || !['ADMIN', 'SUPER_ADMIN', 'AUDITOR', 'AREA_MANAGER', 'ACCOUNTS'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const branchId = searchParams.get('branchId')

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to dates are required' }, { status: 400 })
  }

  const fromDate = new Date(from + 'T00:00:00+06:00')
  const toDate = new Date(to + 'T23:59:59+06:00')
  const branchFilter = branchId ? { branchId: parseInt(branchId) } : {}

  try {
    const [branches, incomeRows, expenseRows] = await Promise.all([
      prisma.branch.findMany({
        where: branchId ? { id: parseInt(branchId) } : { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),

      prisma.entryItem.findMany({
        where: {
          amount: { gt: 0 },
          entry: {
            date: { gte: fromDate, lte: toDate },
            ...branchFilter,
          },
          category: {
            type: 'INCOME',
            name: { notIn: ['Opening Balance', 'Branch Transfer Received'] },
          },
        },
        select: {
          categoryId: true,
          amount: true,
          category: { select: { name: true } },
          entry: { select: { branchId: true } },
        },
      }),

      prisma.expenseEntry.findMany({
        where: {
          isTransferEntry: false,
          dailyEntry: {
            date: { gte: fromDate, lte: toDate },
            ...branchFilter,
          },
        },
        select: {
          categoryId: true,
          amount: true,
          category: { select: { name: true, frequency: true } },
          dailyEntry: { select: { branchId: true } },
        },
      }),
    ])

    // Aggregate income by category × branch
    const incomeMap = new Map<number, { name: string; total: number; byBranch: Record<number, number> }>()
    for (const row of incomeRows) {
      if (!incomeMap.has(row.categoryId)) {
        incomeMap.set(row.categoryId, { name: row.category?.name ?? 'Unknown', total: 0, byBranch: {} })
      }
      const inc = incomeMap.get(row.categoryId)!
      inc.total += row.amount
      inc.byBranch[row.entry.branchId] = (inc.byBranch[row.entry.branchId] ?? 0) + row.amount
    }

    // Aggregate expenses by category × branch
    const expenseMap = new Map<number, { name: string; frequency: string | null; total: number; byBranch: Record<number, number> }>()
    for (const row of expenseRows) {
      if (!expenseMap.has(row.categoryId)) {
        expenseMap.set(row.categoryId, {
          name: row.category?.name ?? 'Unknown',
          frequency: row.category?.frequency ?? null,
          total: 0,
          byBranch: {},
        })
      }
      const exp = expenseMap.get(row.categoryId)!
      exp.total += row.amount
      exp.byBranch[row.dailyEntry.branchId] = (exp.byBranch[row.dailyEntry.branchId] ?? 0) + row.amount
    }

    const income = Array.from(incomeMap.entries())
      .map(([categoryId, data]) => ({ categoryId, categoryName: data.name, total: data.total, byBranch: data.byBranch }))
      .sort((a, b) => b.total - a.total)

    const expenses = Array.from(expenseMap.entries())
      .map(([categoryId, data]) => ({ categoryId, categoryName: data.name, frequency: data.frequency, total: data.total, byBranch: data.byBranch }))
      .sort((a, b) => b.total - a.total)

    return NextResponse.json({ branches, income, expenses })
  } catch (err) {
    console.error('category report error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
