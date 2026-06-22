import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { startOfMonth, endOfMonth } from 'date-fns'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { month, year, employeeId } = body

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
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Advance sync error:', error)
    if (error.message === 'LOCKED') {
      return NextResponse.json({ error: 'Salary record is locked for this month' }, { status: 423 })
    }
    return NextResponse.json({ error: 'Failed to sync advances' }, { status: 500 })
  }
}
