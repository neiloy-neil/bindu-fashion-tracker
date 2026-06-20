import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userRole = req.headers.get('x-user-role')
  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const resolvedParams = await params
  const id = parseInt(resolvedParams.id)
  
  try {
    const { name, isActive } = await req.json()

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(isActive !== undefined && { isActive }),
      }
    })
    return NextResponse.json(employee)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userRole = req.headers.get('x-user-role')
  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const resolvedParams = await params
  const id = parseInt(resolvedParams.id)

  try {
    const advanceSalariesCount = await prisma.advanceSalary.count({ where: { employeeId: id } })
    if (advanceSalariesCount > 0) {
      return NextResponse.json({ error: 'Cannot delete employee because they have advance salary records. Please deactivate instead.' }, { status: 409 })
    }

    const employee = await prisma.employee.delete({ where: { id } })
    return NextResponse.json(employee)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
