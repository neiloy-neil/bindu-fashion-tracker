import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = req.headers.get('x-user-role')
  if (role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const resolvedParams = await params
  const branchId = parseInt(resolvedParams.id)

  try {
    const employeeCount = await prisma.employee.count({ where: { branchId } })
    if (employeeCount > 0) {
      return NextResponse.json({ error: 'Cannot delete branch with employees. Reassign or deactivate employees first.' }, { status: 409 })
    }

    const entryCount = await prisma.dailyEntry.count({ where: { branchId } })
    if (entryCount > 0) {
      return NextResponse.json({ error: 'Cannot delete branch with existing entries. Deactivate it instead.' }, { status: 409 })
    }

    const branch = await prisma.branch.delete({ where: { id: branchId } })
    return NextResponse.json(branch)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = req.headers.get('x-user-role')
  if (role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const resolvedParams = await params
  const branchId = parseInt(resolvedParams.id)
  const { name, code, isActive, type, address, contactPerson, phoneNumber } = await req.json()

  const dataToUpdate: any = {}
  if (name !== undefined) dataToUpdate.name = name
  if (code !== undefined) dataToUpdate.code = code
  if (isActive !== undefined) dataToUpdate.isActive = isActive
  if (type !== undefined) dataToUpdate.type = type
  if (address !== undefined) dataToUpdate.address = address
  if (contactPerson !== undefined) dataToUpdate.contactPerson = contactPerson
  if (phoneNumber !== undefined) dataToUpdate.phoneNumber = phoneNumber

  try {
    const branch = await prisma.branch.update({
      where: { id: branchId },
      data: dataToUpdate,
    })
    return NextResponse.json(branch)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
