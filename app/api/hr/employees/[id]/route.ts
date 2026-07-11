import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const employeeFullSelect = {
  id: true,
  employeeId: true,
  name: true,
  designation: true,
  basicSalary: true,
  conveyance: true,
  yearlyLeaveAllowance: true,
  mobileNumber: true,
  dateOfBirth: true,
  joiningDate: true,
  address: true,
  emergencyContact: true,
  bloodGroup: true,
  nidNumber: true,
  oldIdCard: true,
  photoUrl: true,
  isActive: true,
  branchId: true,
  branch: { select: { name: true } },
} as const

const employeeLimitedSelect = {
  id: true,
  employeeId: true,
  name: true,
  designation: true,
  photoUrl: true,
  joiningDate: true,
  isActive: true,
  branchId: true,
  branch: { select: { name: true } },
} as const

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const employeeId = parseInt(id)
  const role = req.headers.get('x-user-role')
  const userBranchId = req.headers.get('x-user-branch-id')
  const managedBranchIds = req.headers.get('x-user-managed-branches')
  if (!role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  if (Number.isNaN(employeeId)) {
    return NextResponse.json({ error: 'Invalid employee id' }, { status: 400 })
  }

  try {
    if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'HR_ADMIN' || role === 'AUDITOR') {
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: employeeFullSelect,
      })
      
      if (!employee) {
        return NextResponse.json({ error: 'Not Found' }, { status: 404 })
      }
      
      return NextResponse.json(employee)
    }

    if (role === 'BRANCH') {
      if (!userBranchId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const employee = await prisma.employee.findFirst({
        where: { id: employeeId, branchId: parseInt(userBranchId) },
        select: employeeLimitedSelect,
      })

      if (!employee) {
        return NextResponse.json({ error: 'Not Found' }, { status: 404 })
      }

      return NextResponse.json(employee)
    }

    if (role === 'AREA_MANAGER') {
      const allowedBranchIds = managedBranchIds
        ?.split(',')
        .map(value => parseInt(value))
        .filter(value => !Number.isNaN(value)) ?? []

      if (allowedBranchIds.length === 0) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const employee = await prisma.employee.findFirst({
        where: { id: employeeId, branchId: { in: allowedBranchIds } },
        select: employeeLimitedSelect,
      })

      if (!employee) {
        return NextResponse.json({ error: 'Not Found' }, { status: 404 })
      }

      return NextResponse.json(employee)
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const role = req.headers.get('x-user-role')
  const userBranchId = req.headers.get('x-user-branch-id')
  if (!role || !['ADMIN', 'SUPER_ADMIN', 'HR_ADMIN', 'BRANCH'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const data = await req.json()
    
    // Check ownership if BRANCH
    if (role === 'BRANCH') {
      const existing = await prisma.employee.findUnique({ where: { id: parseInt(id) }, select: { branchId: true } })
      if (!existing || String(existing.branchId) !== String(userBranchId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      // Strip out salary updates
      delete data.basicSalary
      delete data.conveyance
      delete data.yearlyLeaveAllowance
      data.branchId = userBranchId // Force keep branch
    }

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
  const { id } = await params
  const role = req.headers.get('x-user-role')
  const userBranchId = req.headers.get('x-user-branch-id')
  if (!role || !['ADMIN', 'SUPER_ADMIN', 'HR_ADMIN', 'BRANCH'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const employeeId = parseInt(id)

    if (role === 'BRANCH') {
      const existing = await prisma.employee.findUnique({ where: { id: employeeId }, select: { branchId: true } })
      if (!existing || String(existing.branchId) !== String(userBranchId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

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
