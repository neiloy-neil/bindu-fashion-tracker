import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const userRole = req.headers.get('x-user-role')
  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const includeInactive = searchParams.get('includeInactive') === 'true'

  try {
    const categories = await prisma.expenseCategory.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(categories)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const userRole = req.headers.get('x-user-role')
  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const { name, frequency, isActive } = await req.json()
    if (!name || !frequency) return NextResponse.json({ error: 'Name and frequency are required' }, { status: 400 })

    const existing = await prisma.expenseCategory.findUnique({ where: { name } })
    if (existing) {
      return NextResponse.json({ error: 'Expense Category with this name already exists' }, { status: 409 })
    }

    const category = await prisma.expenseCategory.create({
      data: {
        name,
        frequency,
        isActive: isActive !== undefined ? isActive : true,
      }
    })
    return NextResponse.json(category, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
