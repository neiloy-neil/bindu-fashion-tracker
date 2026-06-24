import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calcSalary } from '@/lib/hr/calculations'

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  const userIdStr = req.headers.get('x-user-id')

  if (!role || !userIdStr || (role !== 'ADMIN' && role !== 'HR_ADMIN' && role !== 'AUDITOR' && role !== 'BRANCH')) {
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

  // RBAC logic
  if (role === 'BRANCH') {
    let ownEmployeeId = req.headers.get('x-user-employee-id')

    if (!ownEmployeeId) {
      const user = await prisma.user.findUnique({ where: { id: parseInt(userIdStr) } })
      if (!user) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (!user.employeeId) {
        return NextResponse.json({ error: 'No associated employee record found' }, { status: 404 })
      }
      ownEmployeeId = user.employeeId.toString()
    }

    if (employeeId && employeeId !== ownEmployeeId) {
      return NextResponse.json({ error: 'Forbidden: Cannot access other employee slips' }, { status: 403 })
    }

    // Branch users can only see their own slip
    effectiveEmployeeId = ownEmployeeId
  }

  try {
    const records = await prisma.salaryRecord.findMany({
      where: {
        month: parseInt(month),
        year: parseInt(year),
        ...(branchId ? { employee: { branchId: parseInt(branchId) } } : {}),
        ...(effectiveEmployeeId ? { employeeId: parseInt(effectiveEmployeeId) } : {})
      },
      include: {
        employee: true
      },
      orderBy: { employee: { id: 'asc' } }
    })

    const yearRecords = await prisma.salaryRecord.findMany({
      where: {
        year: parseInt(year),
        employee: {
          ...(branchId ? { branchId: parseInt(branchId) } : {}),
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
