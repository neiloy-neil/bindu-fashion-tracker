import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  const userIdStr = req.headers.get('x-user-id')

  if (!role || !userIdStr || !['ADMIN', 'SUPER_ADMIN', 'HR_ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { month, year, branchId, lock } = await req.json()

  if (!month || !year || typeof lock !== 'boolean') {
    return NextResponse.json({ error: 'month, year, and lock are required' }, { status: 400 })
  }

  const userId = parseInt(userIdStr)

  const result = await prisma.salaryRecord.updateMany({
    where: {
      month: parseInt(month),
      year: parseInt(year),
      ...(branchId ? { employee: { branchId: parseInt(branchId) } } : {}),
    },
    data: lock
      ? { lockedAt: new Date(), lockedById: userId }
      : { lockedAt: null, lockedById: null },
  })

  return NextResponse.json({ updated: result.count })
}
