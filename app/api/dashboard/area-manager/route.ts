import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  const managedBranchesHeader = req.headers.get('x-user-managed-branches')

  if (!role || !['ADMIN', 'SUPER_ADMIN', 'AREA_MANAGER'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const month = searchParams.get('month')
  const year = searchParams.get('year')

  let dateFilter: { gte: Date; lte: Date } | undefined
  if (startDate && endDate) {
    dateFilter = {
      gte: new Date(startDate + 'T00:00:00.000+06:00'),
      lte: new Date(endDate + 'T23:59:59.999+06:00'),
    }
  } else if (month && year) {
    const m = parseInt(month)
    const y = parseInt(year)
    dateFilter = {
      gte: new Date(`${y}-${String(m).padStart(2, '0')}-01T00:00:00.000+06:00`),
      lte: new Date(m === 12 ? `${y + 1}-01-01T00:00:00.000+06:00` : `${y}-${String(m + 1).padStart(2, '0')}-01T00:00:00.000+06:00`),
    }
  }

  // Determine which branches to include
  let branchIds: number[] | undefined
  if (role === 'AREA_MANAGER' && managedBranchesHeader) {
    branchIds = managedBranchesHeader.split(',').map(Number).filter(Boolean)
  }

  const branchWhere = branchIds ? { id: { in: branchIds } } : {}

  const branches = await prisma.branch.findMany({
    where: { ...branchWhere, isActive: true },
    select: { id: true, name: true, address: true },
    orderBy: { name: 'asc' },
  })

  const results = await Promise.all(
    branches.map(async (branch) => {
      const entryWhere = {
        branchId: branch.id,
        ...(dateFilter ? { date: dateFilter } : {}),
      }

      const [incomeAgg, expenseAgg, transfersOutAgg, transfersInAgg, entryCount] = await Promise.all([
        prisma.entryItem.aggregate({
          where: { entry: entryWhere },
          _sum: { amount: true },
        }),
        prisma.expenseEntry.aggregate({
          where: { dailyEntry: entryWhere },
          _sum: { amount: true },
        }),
        prisma.transfer.aggregate({
          where: {
            dailyEntry: { branchId: branch.id },
            status: { in: ['PENDING', 'ACKNOWLEDGED'] },
            ...(dateFilter ? { createdAt: dateFilter } : {}),
          },
          _sum: { amount: true },
        }),
        prisma.transfer.aggregate({
          where: {
            account: { branchId: branch.id },
            status: 'ACKNOWLEDGED',
            ...(dateFilter ? { createdAt: dateFilter } : {}),
          },
          _sum: { amount: true },
        }),
        prisma.dailyEntry.count({ where: entryWhere }),
      ])

      const totalIncome = incomeAgg._sum?.amount ?? 0
      const totalExpense = expenseAgg._sum?.amount ?? 0
      const totalTransfersOut = transfersOutAgg._sum?.amount ?? 0
      const totalTransfersIn = transfersInAgg._sum?.amount ?? 0
      const netCashFlow = totalIncome - totalExpense - totalTransfersOut + totalTransfersIn

      return {
        branch,
        totalIncome,
        totalExpense,
        totalTransfersOut,
        totalTransfersIn,
        netCashFlow,
        entryCount,
      }
    })
  )

  return NextResponse.json(results)
}
