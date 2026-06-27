import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role')
    const userBranchId = req.headers.get('x-user-branch-id')

    if (!userRole || (userRole !== 'ADMIN' && userRole !== 'BRANCH')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { branchId, attendances, date } = await req.json()
    const targetBranchId = userRole === 'BRANCH' ? parseInt(userBranchId || '0') : parseInt(branchId)

    if (!targetBranchId) {
      return NextResponse.json({ error: 'Branch ID is required' }, { status: 400 })
    }

    // Get the branch to find shiftStartTime
    const branch = await prisma.branch.findUnique({
      where: { id: targetBranchId },
      select: { shiftStartTime: true }
    })

    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }

    const shiftTime = branch.shiftStartTime || "09:00"
    const [shiftHour, shiftMin] = shiftTime.split(':').map(Number)
    
    // Allow a grace period (e.g., 15 minutes)
    const gracePeriodMinutes = 15
    const shiftStartTotalMinutes = shiftHour * 60 + shiftMin + gracePeriodMinutes

    const dateObj = new Date(date)
    // Clear time for the date object to enforce uniqueness purely on date
    dateObj.setUTCHours(0, 0, 0, 0)

    const result = await prisma.$transaction(async (tx) => {
      let successCount = 0
      
      for (const att of attendances) {
        const { employeeId, checkInTimeStr, isAbsent } = att
        
        let status = 'PRESENT'
        let checkInTime = new Date(dateObj) // Default to today

        if (isAbsent) {
          status = 'ABSENT'
        } else if (checkInTimeStr) {
          // checkInTimeStr in "HH:MM" format
          const [hour, min] = checkInTimeStr.split(':').map(Number)
          checkInTime.setUTCHours(hour, min, 0, 0)

          const checkInTotalMinutes = hour * 60 + min
          if (checkInTotalMinutes > shiftStartTotalMinutes) {
            status = 'LATE'
          }
        } else {
          // If no specific time provided but marked present, assume they checked in right now
          checkInTime = new Date()
          const checkInTotalMinutes = checkInTime.getUTCHours() * 60 + checkInTime.getUTCMinutes()
          if (checkInTotalMinutes > shiftStartTotalMinutes) {
            status = 'LATE'
          }
        }

        // Upsert attendance record for this employee and date
        await tx.attendance.upsert({
          where: {
            employeeId_date: {
              employeeId: parseInt(employeeId),
              date: dateObj
            }
          },
          update: {
            checkInTime: checkInTime,
            status: status
          },
          create: {
            employeeId: parseInt(employeeId),
            branchId: targetBranchId,
            date: dateObj,
            checkInTime: checkInTime,
            status: status
          }
        })
        successCount++
      }
      return successCount
    })

    return NextResponse.json({ message: 'Attendance recorded successfully', count: result }, { status: 200 })
  } catch (error) {
    logger.error('attendance.create_failed', error)
    return NextResponse.json({ error: 'Failed to record attendance' }, { status: 500 })
  }
}
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const dateStr = searchParams.get('date')
  const branchId = searchParams.get('branchId')
  
  if (!dateStr || !branchId) {
    return NextResponse.json({ error: 'Missing date or branchId' }, { status: 400 })
  }

  const dateObj = new Date(dateStr)
  dateObj.setUTCHours(0, 0, 0, 0)

  const attendances = await prisma.attendance.findMany({
    where: {
      branchId: parseInt(branchId),
      date: dateObj
    },
    include: {
      employee: {
        select: { id: true, name: true, employeeId: true }
      }
    }
  })

  return NextResponse.json({ attendances }, { status: 200 })
}
