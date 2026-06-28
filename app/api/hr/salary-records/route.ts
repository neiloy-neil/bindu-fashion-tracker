import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  if (!role || !['ADMIN', 'SUPER_ADMIN', 'HR_ADMIN', 'AUDITOR'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

    // Fetch advances to resolve branch users
    const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1)
    const endOfMonth = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999)

    const advances = await prisma.advanceSalary.findMany({
      where: {
        createdAt: { gte: startOfMonth, lte: endOfMonth }
      },
      include: {
        dailyEntry: {
          select: { branchId: true }
        }
      }
    })

    // Fetch approved unpaid leaves to calculate auto deductions
    const leaves = await prisma.leaveRecord.findMany({
      where: {
        status: 'APPROVED',
        type: 'UNPAID',
        startDate: { lte: endOfMonth },
        endDate: { gte: startOfMonth },
        ...(branchId ? { employee: { branchId: parseInt(branchId) } } : {})
      }
    })

    const calculatedLeaves: Record<number, number> = {}
    leaves.forEach(l => {
      const overlapStart = l.startDate < startOfMonth ? startOfMonth : l.startDate
      const overlapEnd = l.endDate > endOfMonth ? endOfMonth : l.endDate
      if (overlapStart <= overlapEnd) {
        const diffTime = overlapEnd.getTime() - overlapStart.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
        calculatedLeaves[l.employeeId] = (calculatedLeaves[l.employeeId] || 0) + diffDays
      }
    })

    const attendances = await prisma.attendance.findMany({
      where: {
        date: { gte: startOfMonth, lte: endOfMonth },
        ...(branchId ? { branchId: parseInt(branchId) } : {})
      }
    })

    const calculatedAttendance: Record<number, { lateDays: number, absentDays: number }> = {}
    attendances.forEach(att => {
      if (!calculatedAttendance[att.employeeId]) {
        calculatedAttendance[att.employeeId] = { lateDays: 0, absentDays: 0 }
      }
      if (att.status === 'LATE') calculatedAttendance[att.employeeId].lateDays++
      if (att.status === 'ABSENT') calculatedAttendance[att.employeeId].absentDays++
    })

    // Fetch BRANCH users to map branchId -> username
    const branchUsers = await prisma.user.findMany({
      where: { role: 'BRANCH' },
      select: { username: true, branchId: true }
    })

    const branchToUserMap = new Map()
    branchUsers.forEach(u => {
      if (u.branchId) branchToUserMap.set(u.branchId, u.username)
    })

    const recordsWithAdvances = records.map(r => {
      const empAdvances = advances
        .filter(a => a.employeeId === r.employeeId)
        .map(a => ({
          amount: a.amount,
          date: a.createdAt,
          user: a.dailyEntry?.branchId ? branchToUserMap.get(a.dailyEntry.branchId) || 'Unknown' : 'Unknown'
        }))
      return { ...r, advances: empAdvances }
    })

    return NextResponse.json({ records: recordsWithAdvances, calculatedLeaves, calculatedAttendance })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  const userId = req.headers.get('x-user-id')
  
  if (!role || !['ADMIN', 'SUPER_ADMIN', 'HR_ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const rawBody = await req.json()
    
    const salaryPayloadSchema = z.object({
      month: z.union([z.string(), z.number()]).transform(v => Number(v)).refine(v => v >= 1 && v <= 12, 'Invalid month'),
      year: z.union([z.string(), z.number()]).transform(v => Number(v)),
      records: z.array(z.object({
        employeeId: z.number(),
        hrAdvanceDeducted: z.number().nonnegative().optional(),
        leaveDaysTaken: z.number().nonnegative().optional(),
        leaveAdjustment: z.number().optional(),
        lateDays: z.number().nonnegative().optional(),
        otDays: z.number().nonnegative().optional(),
        attendanceBonus: z.number().nonnegative().optional(),
        conveyanceOverride: z.number().optional().nullable(),
        notes: z.string().optional()
      }))
    })

    const parsed = salaryPayloadSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
    }

    const { month: m, year: y, records } = parsed.data

    // Check if the month is locked
    const existingLock = await prisma.salaryRecord.findFirst({
      where: { month: m, year: y, lockedAt: { not: null } }
    })

    if (existingLock) {
      return NextResponse.json({ error: 'This month\'s payroll has been finalized.' }, { status: 423 })
    }

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

    if (userId) {
      await logAudit({
        userId: parseInt(userId),
        action: 'UPDATE',
        entityType: 'SalaryRecord_Batch',
        entityId: m, // Using month as identifier for the batch update
        newValues: { month: m, year: y, recordsModified: records.length },
        reason: 'Bulk payroll adjustments by HR/Admin'
      })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
