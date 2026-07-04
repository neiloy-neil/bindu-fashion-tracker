import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const role = request.headers.get('x-user-role')
    if (!role || !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const categoryId = parseInt(id)
    const { name, type, frequency, isActive, parentId, requiresAttachment, isAutoTransferred, applicableTo } = await request.json()

    const existing = await prisma.category.findUnique({ where: { id: categoryId } })
    if (!existing) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

    if (name && name.trim() !== existing.name) {
      const clash = await prisma.category.findUnique({ where: { name: name.trim() } })
      if (clash) return NextResponse.json({ error: 'A category with this name already exists' }, { status: 409 })
    }

    const category = await prisma.category.update({
      where: { id: categoryId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(type !== undefined && { type }),
        ...(frequency !== undefined && { frequency: (type ?? existing.type) === 'EXPENSE' ? frequency : null }),
        ...(parentId !== undefined && { parentId: parentId ? Number(parentId) : null }),
        ...(requiresAttachment !== undefined && { requiresAttachment: !!requiresAttachment }),
        ...(isAutoTransferred !== undefined && { isAutoTransferred: !!isAutoTransferred }),
        ...(applicableTo !== undefined && { applicableTo: Array.isArray(applicableTo) ? applicableTo : [] }),
      },
    })

    return NextResponse.json(category)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const role = request.headers.get('x-user-role')
    if (!role || !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const categoryId = parseInt(id)

    const existing = await prisma.category.findUnique({
      where: { id: categoryId },
      include: { children: true },
    })
    if (!existing) return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    if (existing.children.length > 0) return NextResponse.json({ error: 'Delete sub-categories first before deleting this parent category.' }, { status: 409 })

    const itemCount = await prisma.entryItem.count({ where: { categoryId } })
    const expenseCount = await prisma.expenseEntry.count({ where: { categoryId } })
    if (itemCount > 0 || expenseCount > 0) {
      return NextResponse.json({ error: 'Category is used in existing entries — deactivate it instead of deleting.' }, { status: 409 })
    }

    await prisma.category.delete({ where: { id: categoryId } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
