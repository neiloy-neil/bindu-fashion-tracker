import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  if (!role || (role !== 'ADMIN' && role !== 'SUPER_ADMIN' && role !== 'HR_ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get('branchId') ? parseInt(searchParams.get('branchId')!) : null
  const queryMonth = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null
  const queryYear = searchParams.get('year') ? parseInt(searchParams.get('year')!) : null

  try {
    const now = new Date()
    const currentMonth = queryMonth ?? (now.getMonth() + 1)
    const currentYear = queryYear ?? now.getFullYear()

    const branchFilter = branchId ? { branchId } : {}

    // Get active employees count (scoped to branch if provided)
    const activeEmployees = await prisma.employee.count({
      where: { isActive: true, ...branchFilter }
    })

    // Get processed records for the requested month, scoped to branch if provided
    const processedRecords = await prisma.salaryRecord.findMany({
      where: {
        month: currentMonth,
        year: currentYear,
        ...(branchId ? { employee: { branchId } } : {}),
      },
      include: { employee: true }
    })

    const isLocked = processedRecords.some(r => r.lockedAt !== null)

    const { calcSalary } = await import('@/lib/hr/calculations')

    let totalNetPayable = 0
    for (const rec of processedRecords) {
      const calc = calcSalary(rec.employee, rec, 0)
      totalNetPayable += calc.netPayable
    }

    const processedCount = processedRecords.length
    const isProcessed = processedCount > 0

    return NextResponse.json({
      activeEmployees,
      processedCount,
      totalNetPayable,
      isLocked,
      isProcessed,
      month: currentMonth,
      year: currentYear,
      branchId,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
