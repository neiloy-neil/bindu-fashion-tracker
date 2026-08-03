import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getReqPerms, FORBIDDEN } from '@/lib/server-auth'

export async function PATCH(req: NextRequest) {
  const auth = await getReqPerms(req)
  if (!auth || !auth.perms['payroll.slips.approve']) return FORBIDDEN()
  const userId = auth.userId

  const { month, year, branchId, lock } = await req.json()

  if (!month || !year || typeof lock !== 'boolean') {
    return NextResponse.json({ error: 'month, year, and lock are required' }, { status: 400 })
  }

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
