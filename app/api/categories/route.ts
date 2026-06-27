import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'
    const type = searchParams.get('type') // 'INCOME' | 'EXPENSE' | null (all)

    const categories = await prisma.category.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...(type ? { type } : {}),
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
    if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { name, type, frequency, isActive } = await request.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    if (!type || !['INCOME', 'EXPENSE'].includes(type)) return NextResponse.json({ error: 'Type must be INCOME or EXPENSE' }, { status: 400 })
    if (type === 'EXPENSE' && !frequency) return NextResponse.json({ error: 'Frequency is required for expense categories' }, { status: 400 })

    const existing = await prisma.category.findUnique({ where: { name: name.trim() } })
    if (existing) return NextResponse.json({ error: 'A category with this name already exists' }, { status: 409 })

    const category = await (prisma.category.create as any)({
      data: {
        name: name.trim(),
        type,
        frequency: type === 'EXPENSE' ? frequency : null,
        isActive: isActive !== undefined ? isActive : true,
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
