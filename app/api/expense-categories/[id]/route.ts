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
    const { name, frequency, isActive } = await req.json()
    
    if (name) {
      const existing = await prisma.expenseCategory.findFirst({ where: { name, id: { not: id } } })
      if (existing) {
        return NextResponse.json({ error: 'Expense Category with this name already exists' }, { status: 409 })
      }
    }

    const category = await prisma.expenseCategory.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(frequency && { frequency }),
        ...(isActive !== undefined && { isActive }),
      }
    })
    return NextResponse.json(category)
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
    const entriesCount = await prisma.expenseEntry.count({ where: { categoryId: id } })
    if (entriesCount > 0) {
      return NextResponse.json({ error: 'Cannot delete expense category because it is referenced in expense entries. Please deactivate it instead.' }, { status: 409 })
    }

    const category = await prisma.expenseCategory.delete({ where: { id } })
    return NextResponse.json(category)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
