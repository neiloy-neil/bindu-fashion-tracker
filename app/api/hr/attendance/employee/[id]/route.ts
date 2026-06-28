import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth, parseISO, startOfYear, endOfYear } from 'date-fns'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = req.headers.get('x-user-role')
  if (!role || !['ADMIN', 'SUPER_ADMIN', 'HR_ADMIN', 'BRANCH', 'AUDITOR', 'AREA_MANAGER'].includes(role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const employeeId = parseInt(id)
  if (isNaN(employeeId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const monthStr = searchParams.get('month') || new Date().toISOString().slice(0, 7)

  try {
    const monthStart = startOfMonth(parseISO(`${monthStr}-01`))
    const monthEnd = endOfMonth(parseISO(`${monthStr}-01`))
    const yearStart = startOfYear(parseISO(`${monthStr}-01`))
    const yearEnd = endOfYear(parseISO(`${monthStr}-01`))

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        branch: { select: { id: true, name: true, shiftStartTime: true } },
        attendances: {
          where: { date: { gte: monthStart, lte: monthEnd } },
          orderBy: { date: 'asc' },
          select: { date: true, checkInTime: true, status: true, note: true },
        },
        leaveRecords: {
          where: {
            startDate: { lte: yearEnd },
            endDate: { gte: yearStart },
            status: 'APPROVED',
          },
          orderBy: { startDate: 'desc' },
          select: {
            id: true,
            type: true,
            startDate: true,
            endDate: true,
            reason: true,
            status: true,
          },
        },
        transfers: {
          orderBy: { transferDate: 'desc' },
          include: {
            fromBranch: { select: { name: true } },
            toBranch: { select: { name: true } },
          },
        },
        salaryRecords: {
          where: { year: monthStart.getFullYear() },
          orderBy: { month: 'asc' },
          select: { month: true, leaveDaysTaken: true, lateDays: true, lockedAt: true },
        },
      },
    })

    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

    const attendanceMap: Record<number, {
      date: string
      checkInTime: string | null
      status: string
      note: string | null
    }> = {}

    let presentDays = 0
    let absentDays = 0
    let lateDays = 0
    let leaveDays = 0

    employee.attendances.forEach(att => {
      const day = att.date.getDate()
      attendanceMap[day] = {
        date: att.date.toISOString(),
        checkInTime: att.checkInTime?.toISOString() ?? null,
        status: att.status,
        note: att.note,
      }
      if (att.status === 'PRESENT') presentDays++
      else if (att.status === 'ABSENT') absentDays++
      else if (att.status === 'LATE') {
        presentDays++
        lateDays++
      } else if (att.status === 'LEAVE') {
        leaveDays++
      }
    })

    const leaveSummary: Record<string, number> = {}
    employee.leaveRecords.forEach(lr => {
      const days = Math.round(
        (new Date(lr.endDate).getTime() - new Date(lr.startDate).getTime()) / 86400000
      ) + 1
      leaveSummary[lr.type] = (leaveSummary[lr.type] || 0) + days
    })

    return NextResponse.json({
      employee: {
        id: employee.id,
        employeeId: employee.employeeId,
        name: employee.name,
        designation: employee.designation,
        basicSalary: employee.basicSalary,
        photoUrl: employee.photoUrl,
        joiningDate: employee.joiningDate,
        mobileNumber: employee.mobileNumber,
        isActive: employee.isActive,
        yearlyLeaveAllowance: employee.yearlyLeaveAllowance,
        bloodGroup: employee.bloodGroup,
        branch: employee.branch,
      },
      month: monthStr,
      attendanceMap,
      summary: {
        presentDays,
        absentDays,
        lateDays,
        leaveDays,
        onTimeDays: presentDays - lateDays,
      },
      leaveRecords: employee.leaveRecords,
      leaveSummary,
      transfers: employee.transfers,
      salaryRecords: employee.salaryRecords,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
