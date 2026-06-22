import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calcSalary } from '@/lib/hr/calculations'

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  const userIdStr = req.headers.get('x-user-id')

  if (!role || !userIdStr) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
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
    const user = await prisma.user.findUnique({ where: { id: parseInt(userIdStr) } })
    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!user.employeeId) {
      return NextResponse.json({ error: 'No associated employee record found' }, { status: 404 })
    }

    // Branch users can only see their own slip
    effectiveEmployeeId = user.employeeId.toString()
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

    const slips = records.map(record => calcSalary(record.employee, record, 0))

    return NextResponse.json(slips)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
