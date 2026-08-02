import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Returns today's sale vs daily target + MTD sale vs monthly target per branch
export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role') ?? ''
  const userId = parseInt(req.headers.get('x-user-id') ?? '0')
  const userBranchId = parseInt(req.headers.get('x-user-branch-id') ?? '0')

  const allowed = ['ADMIN', 'SUPER_ADMIN', 'AREA_MANAGER', 'AUDITOR', 'ACCOUNTS', 'BRANCH']
  if (!allowed.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  // Today range (Dhaka +06:00)
  const todayStart = new Date(`${now.getFullYear()}-${String(month).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}T00:00:00+06:00`)
  const todayEnd = new Date(`${now.getFullYear()}-${String(month).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}T23:59:59+06:00`)

  // MTD range
  const mtdStart = new Date(`${year}-${String(month).padStart(2,'0')}-01T00:00:00+06:00`)
  const mtdEnd = todayEnd

  // Branch filter
  let branchWhere: object = { isActive: true }
  if (role === 'BRANCH') {
    branchWhere = { id: userBranchId }
  } else if (role === 'AREA_MANAGER') {
    branchWhere = { managedBy: { some: { id: userId } }, isActive: true }
  }

  const [branches, targets, todayEntries, mtdEntries] = await Promise.all([
    prisma.branch.findMany({
      where: branchWhere,
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.branchSalesTarget.findMany({
      where: { month, year, branch: branchWhere },
      select: { branchId: true, monthlyTarget: true, dailyTarget: true },
    }),
    prisma.dailyEntry.findMany({
      where: { date: { gte: todayStart, lte: todayEnd }, branch: branchWhere },
      select: {
        branchId: true,
        items: { select: { amount: true, category: { select: { type: true, name: true } } } },
        receivedTransfers: { select: { amount: true, status: true } },
      },
    }),
    prisma.dailyEntry.findMany({
      where: { date: { gte: mtdStart, lte: mtdEnd }, branch: branchWhere },
      select: {
        branchId: true,
        items: { select: { amount: true, category: { select: { type: true, name: true } } } },
        receivedTransfers: { select: { amount: true, status: true } },
      },
    }),
  ])

  function calcSale(entries: typeof todayEntries, branchId: number) {
    return entries
      .filter(e => e.branchId === branchId)
      .reduce((sum, e) => {
        const items = e.items
          .filter(i => i.category?.type === 'INCOME' && i.category.name !== 'Opening Balance' && i.category.name !== 'Branch Transfer Received')
          .reduce((s, i) => s + i.amount, 0)
        const transfers = e.receivedTransfers
          .filter(t => t.status === 'ACKNOWLEDGED')
          .reduce((s, t) => s + t.amount, 0)
        return sum + items + transfers
      }, 0)
  }

  const targetMap = new Map(targets.map(t => [t.branchId, t]))

  const result = branches.map(b => {
    const target = targetMap.get(b.id)
    const todaySale = calcSale(todayEntries, b.id)
    const mtdSale = calcSale(mtdEntries, b.id)

    const daysInMonth = new Date(year, month, 0).getDate()
    const effectiveDailyTarget = target
      ? (target.dailyTarget > 0 ? target.dailyTarget : (target.monthlyTarget / daysInMonth))
      : 0

    return {
      branchId: b.id,
      branchName: b.name,
      monthlyTarget: target?.monthlyTarget ?? 0,
      dailyTarget: effectiveDailyTarget,
      todaySale,
      mtdSale,
      todayPct: effectiveDailyTarget > 0 ? (todaySale / effectiveDailyTarget * 100) : null,
      mtdPct: (target?.monthlyTarget ?? 0) > 0 ? (mtdSale / target!.monthlyTarget * 100) : null,
    }
  })

  return NextResponse.json(result)
}
