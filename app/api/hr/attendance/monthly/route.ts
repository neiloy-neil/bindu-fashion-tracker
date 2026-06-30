import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { startOfMonth, endOfMonth, parseISO } from 'date-fns'

export async function GET(req: NextRequest) {
  const userRole = req.headers.get('x-user-role')
  const userBranchId = req.headers.get('x-user-branch-id')
  
  if (!userRole || !['ADMIN', 'SUPER_ADMIN', 'HR_ADMIN', 'BRANCH', 'AREA_MANAGER'].includes(userRole)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const monthStr = searchParams.get('month') // e.g. "2026-06"
  const branchIdParam = searchParams.get('branchId')

  if (!monthStr) {
    return NextResponse.json({ error: 'Month parameter is required' }, { status: 400 })
  }

  try {
    const startDate = startOfMonth(parseISO(`${monthStr}-01`))
    const endDate = endOfMonth(parseISO(`${monthStr}-01`))

    let targetBranchId: number | undefined
    if (userRole === 'BRANCH' && userBranchId) {
      targetBranchId = parseInt(userBranchId)
    } else if (branchIdParam) {
      targetBranchId = parseInt(branchIdParam)
    }

    const employeesQuery: any = { isActive: true }
    if (targetBranchId) {
      employeesQuery.branchId = targetBranchId
    } else if (userRole === 'AREA_MANAGER') {
      const userId = req.headers.get('x-user-id')
      if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: parseInt(userId) },
          include: { managedBranches: true }
        })
        const branchIds = user?.managedBranches.map(b => b.id) || []
        employeesQuery.branchId = { in: branchIds }
      }
    }

    const employees = await prisma.employee.findMany({
      where: employeesQuery,
      select: {
        id: true,
        employeeId: true,
        name: true,
        designation: true,
        branch: { select: { name: true } },
        attendances: {
          where: {
            date: {
              gte: startDate,
              lte: endDate
            }
          },
          select: {
            id: true,
            date: true,
            status: true,
            checkInTime: true,
            note: true,
            isExcused: true,
            excuseNote: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Process data to map it by employee and day
    const report = employees.map(emp => {
      const attendanceMap: Record<number, any> = {}
      let presentDays = 0
      let absentDays = 0
      let lateDays = 0
      let leaveDays = 0

      emp.attendances.forEach(att => {
        const day = att.date.getDate()
        attendanceMap[day] = {
          id: att.id,
          status: att.status,
          checkInTime: att.checkInTime,
          note: att.note,
          isExcused: att.isExcused,
          excuseNote: att.excuseNote
        }
        
        if (att.status === 'PRESENT') presentDays++
        else if (att.status === 'ABSENT') absentDays++
        else if (att.status === 'LATE') {
          presentDays++ // Late counts as present, but marked late
          lateDays++
        }
        else if (att.status === 'LEAVE') leaveDays++
      })

      return {
        id: emp.id,
        employeeId: emp.employeeId,
        name: emp.name,
        designation: emp.designation,
        branchName: emp.branch?.name,
        attendanceMap,
        summary: {
          presentDays,
          absentDays,
          lateDays,
          leaveDays
        }
      }
    })

    return NextResponse.json({ report, startDate, endDate })

  } catch (error: any) {
    logger.error('hr.attendance.fetch_monthly_failed', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
