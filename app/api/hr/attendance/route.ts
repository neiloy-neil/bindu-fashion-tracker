import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const attendancePostSchema = z.object({
  branchId: z.union([z.string(), z.number()]).transform(v => Number(v)).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  attendances: z.array(z.object({
    employeeId: z.union([z.string(), z.number()]).transform(v => Number(v)),
    checkInTimeStr: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    checkOutTimeStr: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    isAbsent: z.boolean().optional(),
  })).min(1),
})

export async function POST(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role')
    const userBranchId = req.headers.get('x-user-branch-id')

    if (!userRole || !['ADMIN', 'SUPER_ADMIN', 'BRANCH'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const parsed = attendancePostSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }
    const { branchId, attendances, date } = parsed.data

    const targetBranchId = userRole === 'BRANCH' ? parseInt(userBranchId || '0') : (branchId ?? 0)

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
        const { employeeId, checkInTimeStr, checkOutTimeStr, isAbsent } = att
        
        let status = 'PRESENT'
        let checkInTime = new Date(dateObj)
        let checkOutTime: Date | null = null

        if (isAbsent) {
          status = 'ABSENT'
        } else if (checkInTimeStr) {
          // Interpret HH:MM input as BST (UTC+6) and store as UTC
          checkInTime = new Date(`${date}T${checkInTimeStr}:00+06:00`)

          const [hour, min] = checkInTimeStr.split(':').map(Number)
          const checkInTotalMinutes = hour * 60 + min
          if (checkInTotalMinutes > shiftStartTotalMinutes) {
            status = 'LATE'
          }
        } else {
          // "Check in now" — current moment
          checkInTime = new Date()
          // Compare in BST: shift time is configured in BST
          const bstNow = new Date(checkInTime.getTime() + 6 * 60 * 60 * 1000)
          const checkInTotalMinutes = bstNow.getUTCHours() * 60 + bstNow.getUTCMinutes()
          if (checkInTotalMinutes > shiftStartTotalMinutes) {
            status = 'LATE'
          }
        }

        // Parse checkout time if provided — interpret as BST
        if (checkOutTimeStr) {
          checkOutTime = new Date(`${date}T${checkOutTimeStr}:00+06:00`)
        }

        await tx.attendance.upsert({
          where: {
            employeeId_date: {
              employeeId: employeeId,
              date: dateObj
            }
          },
          update: {
            checkInTime: checkInTime,
            checkOutTime: checkOutTime,
            status: status
          },
          create: {
            employeeId: employeeId,
            branchId: targetBranchId,
            date: dateObj,
            checkInTime: checkInTime,
            checkOutTime: checkOutTime,
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
