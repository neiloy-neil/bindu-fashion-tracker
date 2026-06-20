import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const data = await request.json()
    const role = request.headers.get('x-user-role')
    
    if (role !== 'ADMIN' && role !== 'BRANCH') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const resolvedParams = await params
    const categoryId = parseInt(resolvedParams.id)

    const category = await prisma.category.update({
      where: { id: categoryId },
      data: {
        name: data.name,
        type: data.type,
        isActive: data.isActive
      }
    })

    return NextResponse.json(category)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const role = request.headers.get('x-user-role')
    
    if (role !== 'ADMIN' && role !== 'BRANCH') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const resolvedParams = await params
    const categoryId = parseInt(resolvedParams.id)

    // Default categories shouldn't be deleted, only deactivated
    const existing = await prisma.category.findUnique({ where: { id: categoryId } })
    if (existing?.isDefault) {
       return NextResponse.json({ error: 'Cannot delete default system categories. Deactivate them instead.' }, { status: 400 })
    }

    await prisma.category.delete({
      where: { id: categoryId }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
