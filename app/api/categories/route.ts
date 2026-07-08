import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'
    const type = searchParams.get('type') // 'INCOME' | 'EXPENSE' | null (all)
    const branchType = request.headers.get('x-user-branch-type') // injected by proxy

    // If branchType is set, only return categories applicable to that type (or with empty applicableTo = all types)
    const branchTypeFilter = branchType
      ? { OR: [{ applicableTo: { isEmpty: true } }, { applicableTo: { has: branchType } }] }
      : {}

    const categories = await prisma.category.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...(type ? { type } : {}),
        ...branchTypeFilter,
      },
      include: {
        children: {
          where: {
            ...(includeInactive ? {} : { isActive: true }),
            ...branchTypeFilter,
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(categories)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const role = request.headers.get('x-user-role')
    if (!role || !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { name, type, frequency, isActive, isDefault, parentId, requiresAttachment, isAutoTransferred, applicableTo } = await request.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    if (!type || !['INCOME', 'EXPENSE'].includes(type)) return NextResponse.json({ error: 'Type must be INCOME or EXPENSE' }, { status: 400 })
    if (type === 'EXPENSE' && !frequency && !parentId) return NextResponse.json({ error: 'Frequency is required for expense categories' }, { status: 400 })

    const existing = await prisma.category.findUnique({ where: { name: name.trim() } })
    if (existing) return NextResponse.json({ error: 'A category with this name already exists' }, { status: 409 })

    // If parentId given, verify parent exists and inherit type
    let resolvedType = type
    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: Number(parentId) } })
      if (!parent) return NextResponse.json({ error: 'Parent category not found' }, { status: 404 })
      resolvedType = parent.type // sub-category inherits parent type
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        type: resolvedType,
        frequency: resolvedType === 'EXPENSE' ? (frequency || null) : null,
        isActive: isActive !== undefined ? isActive : true,
        isDefault: isDefault ?? false,
        isAutoTransferred: isAutoTransferred ?? false,
        requiresAttachment: !!requiresAttachment,
        parentId: parentId ? Number(parentId) : null,
        applicableTo: Array.isArray(applicableTo) ? applicableTo : [],
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
