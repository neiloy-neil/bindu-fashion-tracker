import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calcSalary } from '@/lib/hr/calculations'

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  const userIdStr = req.headers.get('x-user-id')

  if (!role || !userIdStr || !['ADMIN', 'SUPER_ADMIN', 'HR_ADMIN', 'AUDITOR', 'BRANCH'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')
  const year = searchParams.get('year')
  const branchId = searchParams.get('branchId')
  const employeeId = searchParams.get('employeeId')

  if (!month || !year) {
    return NextResponse.json({ error: 'month and year are required parameters' }, { status: 400 })
  }

  let effectiveEmployeeId = employeeId
  let effectiveBranchId = branchId

  // RBAC logic
  if (role === 'BRANCH') {
    const userBranchId = req.headers.get('x-user-branch-id')
    if (!userBranchId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    // Branch managers see all employees in their branch, but only approved slips
    effectiveBranchId = userBranchId
    effectiveEmployeeId = employeeId ?? null // allow filtering by specific employee within branch
  }

  const isBranch = role === 'BRANCH'

  try {
    const records = await prisma.salaryRecord.findMany({
      where: {
        month: parseInt(month),
        year: parseInt(year),
        ...(isBranch ? { lockedAt: { not: null } } : {}),
        ...(effectiveBranchId ? { employee: { branchId: parseInt(effectiveBranchId) } } : {}),
        ...(effectiveEmployeeId ? { employeeId: parseInt(effectiveEmployeeId) } : {})
      },
      include: {
        employee: {
          include: {
            branch: true
          }
        }
      },
      orderBy: { employee: { id: 'asc' } }
    })

    const yearRecords = await prisma.salaryRecord.findMany({
      where: {
        year: parseInt(year),
        employee: {
          ...(effectiveBranchId ? { branchId: parseInt(effectiveBranchId) } : {}),
          ...(effectiveEmployeeId ? { id: parseInt(effectiveEmployeeId) } : {})
        }
      },
      select: { employeeId: true, leaveDaysTaken: true }
    })

    const yearlyLeaveMap = new Map<number, number>()
    for (const r of yearRecords) {
      yearlyLeaveMap.set(r.employeeId, (yearlyLeaveMap.get(r.employeeId) ?? 0) + r.leaveDaysTaken)
    }

    const slips = records.map(record =>
      calcSalary(record.employee, record, yearlyLeaveMap.get(record.employeeId) ?? 0)
    )

    return NextResponse.json(slips)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
