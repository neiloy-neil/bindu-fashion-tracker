import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const ALLOWED = ['ADMIN', 'SUPER_ADMIN', 'AUDITOR', 'AREA_MANAGER', 'ACCOUNTS', 'BRANCH']

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  const userBranchId = req.headers.get('x-user-branch-id')

  if (!role || !ALLOWED.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get('branchId')
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

  const bstStart = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00.000+06:00`)
  const bstEnd = month === 12
    ? new Date(`${year + 1}-01-01T00:00:00.000+06:00`)
    : new Date(`${year}-${String(month + 1).padStart(2, '0')}-01T00:00:00.000+06:00`)

  const where: any = {
    date: { gte: bstStart, lt: bstEnd },
  }

  if (role === 'BRANCH' && userBranchId) {
    where.branchId = parseInt(userBranchId)
  } else if (branchId && branchId !== 'all') {
    where.branchId = parseInt(branchId)
  }

  try {
    const entries = await prisma.dailyEntry.findMany({
      where,
      select: {
        id: true,
        date: true,
        pettyCashOpening: true,
        pettyCashReplenished: true,
        pettyCashUsed: true,
        pettyCashClosing: true,
        actualPhysicalCash: true,
        branch: { select: { name: true } },
      },
      orderBy: [{ date: 'asc' }, { branch: { name: 'asc' } }],
    })

    return NextResponse.json(entries)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
