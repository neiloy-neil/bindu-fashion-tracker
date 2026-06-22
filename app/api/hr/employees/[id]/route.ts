import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const role = req.headers.get('x-user-role')
  if (!role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(id) },
      include: {
        branch: { select: { name: true } }
      }
    })
    
    if (!employee) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    }
    
    return NextResponse.json(employee)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const role = req.headers.get('x-user-role')
  if (!role || (role !== 'ADMIN' && role !== 'HR_ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const data = await req.json()
    const employee = await prisma.employee.update({
      where: { id: parseInt(id) },
      data: {
        employeeId: data.employeeId !== undefined ? data.employeeId : undefined,
        name: data.name !== undefined ? data.name : undefined,
        designation: data.designation !== undefined ? data.designation : undefined,
        basicSalary: data.basicSalary !== undefined ? data.basicSalary : undefined,
        conveyance: data.conveyance !== undefined ? data.conveyance : undefined,
        yearlyLeaveAllowance: data.yearlyLeaveAllowance !== undefined ? data.yearlyLeaveAllowance : undefined,
        mobileNumber: data.mobileNumber !== undefined ? data.mobileNumber : undefined,
        dateOfBirth: data.dateOfBirth !== undefined ? data.dateOfBirth : undefined,
        joiningDate: data.joiningDate !== undefined ? data.joiningDate : undefined,
        address: data.address !== undefined ? data.address : undefined,
        emergencyContact: data.emergencyContact !== undefined ? data.emergencyContact : undefined,
        bloodGroup: data.bloodGroup !== undefined ? data.bloodGroup : undefined,
        nidNumber: data.nidNumber !== undefined ? data.nidNumber : undefined,
        oldIdCard: data.oldIdCard !== undefined ? data.oldIdCard : undefined,
        photoUrl: data.photoUrl !== undefined ? data.photoUrl : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
        branchId: data.branchId !== undefined ? (data.branchId ? parseInt(data.branchId) : null) : undefined,
      }
    })
    return NextResponse.json(employee)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const role = req.headers.get('x-user-role')
  if (!role || (role !== 'ADMIN' && role !== 'HR_ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const employeeId = parseInt(id)
    const salaryRecords = await prisma.salaryRecord.count({
      where: { employeeId }
    })

    if (salaryRecords > 0) {
      return NextResponse.json({ error: 'Cannot delete employee with existing salary records. Soft-delete instead by setting isActive to false.' }, { status: 409 })
    }

    const employee = await prisma.employee.update({
      where: { id: employeeId },
      data: { isActive: false }
    })
    return NextResponse.json(employee)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
