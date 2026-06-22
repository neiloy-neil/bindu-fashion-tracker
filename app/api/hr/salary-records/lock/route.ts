import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  const username = req.headers.get('x-user-username')
  
  if (!role || role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden. Only ADMIN can lock payroll.' }, { status: 403 })
  }

  if (!username) {
    return NextResponse.json({ error: 'Username missing from headers' }, { status: 400 })
  }

  try {
    const { month, year } = await req.json()
    
    if (!month || !year) {
      return NextResponse.json({ error: 'month and year are required' }, { status: 400 })
    }

    const m = parseInt(month)
    const y = parseInt(year)

    // Verify user exists and is admin
    const user = await prisma.systemUser.findUnique({
      where: { username }
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
        lockedById: user.id
      }
    })

    return NextResponse.json({ success: true, count: result.count }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
