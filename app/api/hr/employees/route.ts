import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const employeeCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  employeeId: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
  basicSalary: z.number().min(0).optional().default(0),
  conveyance: z.number().min(0).optional().default(1500),
  yearlyLeaveAllowance: z.number().int().min(0).optional().default(12),
  mobileNumber: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  joiningDate: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  emergencyContact: z.string().optional().nullable(),
  bloodGroup: z.string().optional().nullable(),
  nidNumber: z.string().optional().nullable(),
  oldIdCard: z.string().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  branchId: z.union([z.string(), z.number()]).transform(v => Number(v)).optional().nullable(),
})

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  const userBranchId = req.headers.get('x-user-branch-id')
  if (!role || !['ADMIN', 'SUPER_ADMIN', 'HR_ADMIN', 'AUDITOR', 'BRANCH'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const reqBranchId = searchParams.get('branchId')
  const branchId = role === 'BRANCH' ? userBranchId : reqBranchId
  const active = searchParams.get('active')

  try {
    const employees = await prisma.employee.findMany({
      where: {
        ...(branchId ? { branchId: parseInt(branchId) } : {}),
        ...(active !== null ? { isActive: active === 'true' } : {}),
      },
      include: {
        branch: { select: { id: true, name: true } }
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
  const userBranchId = req.headers.get('x-user-branch-id')
  if (!role || !['ADMIN', 'SUPER_ADMIN', 'HR_ADMIN', 'BRANCH'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const parsed = employeeCreateSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }
    const data = parsed.data
    if (role === 'BRANCH') {
      data.branchId = userBranchId ? parseInt(userBranchId) : null
      data.basicSalary = 0
      data.conveyance = 1500
    }

    const employee = await prisma.employee.create({
      data: {
        employeeId: data.employeeId || null,
        name: data.name,
        designation: data.designation || null,
        basicSalary: data.basicSalary,
        conveyance: data.conveyance,
        yearlyLeaveAllowance: data.yearlyLeaveAllowance,
        mobileNumber: data.mobileNumber || null,
        dateOfBirth: data.dateOfBirth || null,
        joiningDate: data.joiningDate || null,
        address: data.address || null,
        emergencyContact: data.emergencyContact || null,
        bloodGroup: data.bloodGroup || null,
        nidNumber: data.nidNumber || null,
        oldIdCard: data.oldIdCard || null,
        photoUrl: data.photoUrl || null,
        isActive: data.isActive,
        branchId: data.branchId ?? null,
      }
    })
    return NextResponse.json(employee, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
