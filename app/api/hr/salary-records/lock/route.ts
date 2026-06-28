import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as { id?: number; role?: string } | undefined
  if (!sessionUser || !['ADMIN', 'SUPER_ADMIN'].includes(sessionUser.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden. Only ADMIN can lock payroll.' }, { status: 403 })
  }

  try {
    const { month, year } = await req.json()

    if (!month || !year) {
      return NextResponse.json({ error: 'month and year are required' }, { status: 400 })
    }

    const m = parseInt(month)
    const y = parseInt(year)
    const userId = sessionUser.id!

    // Check if already locked
    const existingLock = await prisma.salaryRecord.findFirst({
      where: { month: m, year: y, lockedAt: { not: null } }
    })

    if (existingLock) {
      return NextResponse.json({ error: 'Month is already locked' }, { status: 400 })
    }

    // Lock all records for this month
    const result = await prisma.salaryRecord.updateMany({
      where: { month: m, year: y },
      data: {
        lockedAt: new Date(),
        lockedById: userId
      }
    })

    await logAudit({
      userId: userId,
      action: 'UPDATE',
      entityType: 'SalaryRecord_Lock',
      entityId: m, // Using month as entityId since it locks the whole month
      newValues: { month: m, year: y, count: result.count },
      reason: 'Locked payroll for month'
    })

    return NextResponse.json({ success: true, count: result.count }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
