import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  if (!role || (role !== 'ADMIN' && role !== 'HR_ADMIN' && role !== 'AUDITOR')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get('branchId')
  const active = searchParams.get('active')

  try {
    const employees = await prisma.employee.findMany({
      where: {
        ...(branchId ? { branchId: parseInt(branchId) } : {}),
        ...(active !== null ? { isActive: active === 'true' } : {}),
      },
      include: {
        branch: { select: { name: true } }
      },
      orderBy: { id: 'asc' }
    })
    return NextResponse.json(employees)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  if (!role || (role !== 'ADMIN' && role !== 'HR_ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const data = await req.json()
    const employee = await prisma.employee.create({
      data: {
        employeeId: data.employeeId || null,
        name: data.name,
        designation: data.designation || null,
        basicSalary: data.basicSalary || 0,
        conveyance: data.conveyance || 1500,
        yearlyLeaveAllowance: data.yearlyLeaveAllowance || 12,
        mobileNumber: data.mobileNumber || null,
        dateOfBirth: data.dateOfBirth || null,
        joiningDate: data.joiningDate || null,
        address: data.address || null,
        emergencyContact: data.emergencyContact || null,
        bloodGroup: data.bloodGroup || null,
        nidNumber: data.nidNumber || null,
        oldIdCard: data.oldIdCard || null,
        photoUrl: data.photoUrl || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
        branchId: data.branchId ? parseInt(data.branchId) : null,
      }
    })
    return NextResponse.json(employee, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
