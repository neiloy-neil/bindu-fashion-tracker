import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  if (!role || (role !== 'ADMIN' && role !== 'SUPER_ADMIN' && role !== 'HR_ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    // Get active employees count
    const activeEmployees = await prisma.employee.count({
      where: { isActive: true }
    })

    // Get processed records for current month
    const processedRecords = await prisma.salaryRecord.findMany({
      where: { month: currentMonth, year: currentYear },
      include: { employee: true }
    })

    const isLocked = processedRecords.some(r => r.lockedAt !== null)

    // Calculate total net payable
    // We duplicate the calcSalary logic minimally here, or better, we could import calcSalary from '@/lib/hr/calculations'.
    // Since we are in an API route, let's just import calcSalary.
    const { calcSalary } = await import('@/lib/hr/calculations')
    
    let totalNetPayable = 0
    for (const rec of processedRecords) {
      const calc = calcSalary(rec.employee, rec, 0)
      totalNetPayable += calc.netPayable
    }

    // Unprocessed count
    const processedCount = processedRecords.length
    const isProcessed = processedCount > 0

    return NextResponse.json({
      activeEmployees,
      processedCount,
      totalNetPayable,
      isLocked,
      isProcessed,
      month: currentMonth,
      year: currentYear
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
