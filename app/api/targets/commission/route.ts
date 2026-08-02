import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const ALLOWED = ['ADMIN', 'SUPER_ADMIN', 'AREA_MANAGER', 'ACCOUNTS', 'AUDITOR']

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role') ?? ''
  const userId = parseInt(req.headers.get('x-user-id') ?? '0')

  if (!ALLOWED.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const branchId = searchParams.get('branchId')

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to are required' }, { status: 400 })
  }

  const fromDate = new Date(from + 'T00:00:00Z')
  const toDate = new Date(to + 'T23:59:59Z')

  let branchWhere: object = {}
  if (role === 'AREA_MANAGER') {
    branchWhere = { managedBy: { some: { id: userId } } }
    if (branchId) branchWhere = { id: parseInt(branchId), managedBy: { some: { id: userId } } }
  } else if (branchId) {
    branchWhere = { id: parseInt(branchId) }
  }

  const records = await prisma.dailySalesBonus.findMany({
    where: {
      date: { gte: fromDate, lte: toDate },
      branch: branchWhere,
    },
    include: { branch: { select: { id: true, name: true } } },
    orderBy: [{ date: 'desc' }, { branch: { name: 'asc' } }],
  })

  return NextResponse.json(records)
}
