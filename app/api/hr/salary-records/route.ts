import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  if (!role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')
  const year = searchParams.get('year')
  const branchId = searchParams.get('branchId')

  if (!month || !year) {
    return NextResponse.json({ error: 'month and year are required parameters' }, { status: 400 })
  }

  try {
    const records = await prisma.salaryRecord.findMany({
      where: {
        month: parseInt(month),
        year: parseInt(year),
        ...(branchId ? { employee: { branchId: parseInt(branchId) } } : {})
      },
      include: {
        employee: true,
        lockedBy: { select: { username: true } }
      },
      orderBy: { employee: { id: 'asc' } }
    })
    return NextResponse.json(records)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  if (!role || (role !== 'ADMIN' && role !== 'HR_ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { month, year, records } = await req.json()
    
    if (!month || !year || !Array.isArray(records)) {
      return NextResponse.json({ error: 'Invalid payload. month, year, and records array required.' }, { status: 400 })
    }

    // Check if the month is locked
    const existingLock = await prisma.salaryRecord.findFirst({
      where: { month: parseInt(month), year: parseInt(year), lockedAt: { not: null } }
    })

    if (existingLock) {
      return NextResponse.json({ error: 'This month\'s payroll has been finalized.' }, { status: 423 })
    }

    const m = parseInt(month)
    const y = parseInt(year)

    const result = await prisma.$transaction(
      records.map((r: any) => 
        prisma.salaryRecord.upsert({
          where: {
            employeeId_month_year: {
              employeeId: r.employeeId,
              month: m,
              year: y
            }
          },
          update: {
            hrAdvanceDeducted: r.hrAdvanceDeducted !== undefined ? r.hrAdvanceDeducted : undefined,
            leaveDaysTaken: r.leaveDaysTaken !== undefined ? r.leaveDaysTaken : undefined,
            leaveAdjustment: r.leaveAdjustment !== undefined ? r.leaveAdjustment : undefined,
            lateDays: r.lateDays !== undefined ? r.lateDays : undefined,
            otDays: r.otDays !== undefined ? r.otDays : undefined,
            attendanceBonus: r.attendanceBonus !== undefined ? r.attendanceBonus : undefined,
            conveyanceOverride: r.conveyanceOverride !== undefined ? r.conveyanceOverride : undefined,
            notes: r.notes !== undefined ? r.notes : undefined,
          },
          create: {
            employeeId: r.employeeId,
            month: m,
            year: y,
            hrAdvanceDeducted: r.hrAdvanceDeducted || 0,
            trackerAdvanceTotal: 0,
            leaveDaysTaken: r.leaveDaysTaken || 0,
            leaveAdjustment: r.leaveAdjustment || 0,
            lateDays: r.lateDays || 0,
            otDays: r.otDays || 0,
            attendanceBonus: r.attendanceBonus || 0,
            conveyanceOverride: r.conveyanceOverride || null,
            notes: r.notes || '',
          }
        })
      )
    )

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
