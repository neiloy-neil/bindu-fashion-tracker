import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { endOfMonth } from 'date-fns'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const role = (req as any).headers?.get
    ? (req as any).headers.get('x-user-role')
    : null
  let requestMonth: number | null = null
  let requestYear: number | null = null
  let requestEmployeeId: number | null = null

  if (!role || (role !== 'ADMIN' && role !== 'HR_ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { month, year, employeeId } = body
    requestMonth = Number(month)
    requestYear = Number(year)
    requestEmployeeId = employeeId ? parseInt(employeeId) : null
    let syncedEmployees = 0

    if (!month || !year) {
      return NextResponse.json({ error: 'Month and year are required' }, { status: 400 })
    }

    const startDate = new Date(year, month - 1, 1)
    const endDate = endOfMonth(startDate)

    await prisma.$transaction(async (tx) => {
      // Find all CASH advances in the given month/year
      // If employeeId is provided, filter by it.
      const whereClause: any = {
        type: 'CASH',
        dailyEntry: {
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      }
      
      if (employeeId) {
        whereClause.employeeId = parseInt(employeeId)
      }

      const advances = await tx.advanceSalary.findMany({
        where: whereClause,
        include: { employee: true }
      })

      // Group advances by employee
      const employeeTotals = new Map<number, number>()
      for (const adv of advances) {
        if (!adv.amount) continue;
        const current = employeeTotals.get(adv.employeeId) || 0
        employeeTotals.set(adv.employeeId, current + adv.amount)
      }

      // If employeeId is provided but has no advances, ensure we still sync them to 0
      if (employeeId && !employeeTotals.has(parseInt(employeeId))) {
        employeeTotals.set(parseInt(employeeId), 0)
      }

      // For each employee, sync to their SalaryRecord
      for (const [empId, total] of employeeTotals.entries()) {
        syncedEmployees++
        const record = await tx.salaryRecord.findUnique({
          where: {
            employeeId_month_year: {
              employeeId: empId,
              month,
              year
            }
          }
        })

        if (record) {
          if (record.lockedAt) {
            // If locked, we don't update it. But we can't throw 423 for bulk sync, 
            // so if it's a specific employeeId request we'll throw, else just skip.
            if (employeeId) {
              throw new Error('LOCKED')
            }
            continue;
          }
          await tx.salaryRecord.update({
            where: { id: record.id },
            data: { trackerAdvanceTotal: total }
          })
        } else {
          // Create SalaryRecord if it doesn't exist
          await tx.salaryRecord.create({
            data: {
              employeeId: empId,
              month,
              year,
              trackerAdvanceTotal: total,
              hrAdvanceDeducted: 0,
            }
          })
        }

        // Sync EidRecord
        const eidRecord = await tx.eidRecord.findFirst({
          where: {
            employeeId: empId,
            year
          }
        })

        if (eidRecord) {
          const yearStartDate = new Date(year, 0, 1)
          const yearEndDate = endOfMonth(new Date(year, 11, 1))

          const yearAdvances = await tx.advanceSalary.findMany({
            where: {
              employeeId: empId,
              type: 'CASH',
              dailyEntry: {
                date: {
                  gte: yearStartDate,
                  lte: yearEndDate
                }
              }
            }
          })

          const eidTotal = yearAdvances.reduce((sum, a) => sum + (a.amount || 0), 0)

          await tx.eidRecord.update({
            where: { id: eidRecord.id },
            data: { trackerAdvanceTotal: eidTotal }
          })
        }
      }
    })

    logger.info('hr.advance_sync_completed', {
      month,
      year,
      employeeId: requestEmployeeId,
      syncedEmployees,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    logger.error('hr.advance_sync_failed', error, {
      month: requestMonth,
      year: requestYear,
      employeeId: requestEmployeeId,
    })
    if (error.message === 'LOCKED') {
      return NextResponse.json({ error: 'Salary record is locked for this month' }, { status: 423 })
    }
    return NextResponse.json({ error: 'Failed to sync advances' }, { status: 500 })
  }
}
