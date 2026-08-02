import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const WRITE_ROLES = ['ADMIN', 'SUPER_ADMIN', 'AREA_MANAGER']
const READ_ROLES = ['ADMIN', 'SUPER_ADMIN', 'AREA_MANAGER', 'AUDITOR', 'ACCOUNTS', 'BRANCH']

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role') ?? ''
  const userId = parseInt(req.headers.get('x-user-id') ?? '0')
  const userBranchId = parseInt(req.headers.get('x-user-branch-id') ?? '0')

  if (!READ_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined
  const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined
  const branchId = searchParams.get('branchId') ? parseInt(searchParams.get('branchId')!) : undefined

  let branchFilter: { id?: number; managedBy?: { some: { id: number } } } = {}

  if (role === 'BRANCH') {
    branchFilter = { id: userBranchId }
  } else if (role === 'AREA_MANAGER') {
    // Only managed branches
    branchFilter = { managedBy: { some: { id: userId } } }
    if (branchId) branchFilter = { id: branchId, managedBy: { some: { id: userId } } }
  } else if (branchId) {
    branchFilter = { id: branchId }
  }

  const targets = await prisma.branchSalesTarget.findMany({
    where: {
      ...(month !== undefined ? { month } : {}),
      ...(year !== undefined ? { year } : {}),
      branch: branchFilter,
    },
    include: {
      branch: { select: { id: true, name: true } },
      setBy: { select: { username: true } },
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }, { branch: { name: 'asc' } }],
  })

  return NextResponse.json(targets)
}

export async function POST(req: NextRequest) {
  const role = req.headers.get('x-user-role') ?? ''
  const userId = parseInt(req.headers.get('x-user-id') ?? '0')

  if (!WRITE_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { branchId, month, year, monthlyTarget, dailyTarget } = body

  if (!branchId || !month || !year || monthlyTarget === undefined) {
    return NextResponse.json({ error: 'branchId, month, year, monthlyTarget are required' }, { status: 400 })
  }

  // AREA_MANAGER can only set targets for their managed branches
  if (role === 'AREA_MANAGER') {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { managedBranches: { select: { id: true } } },
    })
    const managedIds = user?.managedBranches.map(b => b.id) ?? []
    if (!managedIds.includes(branchId)) {
      return NextResponse.json({ error: 'Not your managed branch' }, { status: 403 })
    }
  }

  const target = await prisma.branchSalesTarget.upsert({
    where: { branchId_month_year: { branchId, month, year } },
    create: { branchId, month, year, monthlyTarget, dailyTarget: dailyTarget ?? 0, setByUserId: userId },
    update: { monthlyTarget, dailyTarget: dailyTarget ?? 0, setByUserId: userId },
    include: { branch: { select: { id: true, name: true } } },
  })

  return NextResponse.json(target)
}
