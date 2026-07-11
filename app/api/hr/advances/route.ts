import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const ALLOWED = ['ADMIN', 'SUPER_ADMIN', 'HR_ADMIN', 'AUDITOR', 'AREA_MANAGER']

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  const userBranchId = req.headers.get('x-user-branch-id')
  const userManagedBranches = req.headers.get('x-user-managed-branches')

  if (!role || !ALLOWED.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null
  const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : null
  const employeeId = searchParams.get('employeeId') ? parseInt(searchParams.get('employeeId')!) : null
  const branchId = searchParams.get('branchId') ? parseInt(searchParams.get('branchId')!) : null

  const entryWhere: any = {}

  if (month && year) {
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 1)
    entryWhere.date = { gte: start, lt: end }
  } else if (year) {
    entryWhere.date = { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) }
  }

  if (role === 'AREA_MANAGER' && userManagedBranches) {
    const allowed = userManagedBranches.split(',').map(Number)
    entryWhere.branchId = branchId && allowed.includes(branchId) ? branchId : { in: allowed }
  } else if (branchId) {
    entryWhere.branchId = branchId
  }

  const where: any = {}
  if (Object.keys(entryWhere).length) where.dailyEntry = entryWhere
  if (employeeId) where.employeeId = employeeId

  const advances = await prisma.advanceSalary.findMany({
    where,
    include: {
      employee: { select: { id: true, name: true, employeeId: true, designation: true } },
      dailyEntry: { select: { date: true, branch: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Summary by employee — split CASH vs PRODUCT so UI can show both
  const byEmployee = new Map<number, { employee: any; cashTotal: number; productTotal: number; total: number; count: number }>()
  for (const a of advances) {
    const key = a.employeeId
    if (!byEmployee.has(key)) byEmployee.set(key, { employee: a.employee, cashTotal: 0, productTotal: 0, total: 0, count: 0 })
    const rec = byEmployee.get(key)!
    const amt = a.amount ?? 0
    if (a.type === 'CASH') rec.cashTotal += amt
    else rec.productTotal += amt
    rec.total += amt
    rec.count++
  }

  const cashTotal = advances.filter(a => a.type === 'CASH').reduce((s, a) => s + (a.amount ?? 0), 0)
  const productTotal = advances.filter(a => a.type !== 'CASH').reduce((s, a) => s + (a.amount ?? 0), 0)

  return NextResponse.json({
    advances,
    summary: Array.from(byEmployee.values()).sort((a, b) => b.total - a.total),
    total: cashTotal + productTotal,
    cashTotal,
    productTotal,
  })
}
