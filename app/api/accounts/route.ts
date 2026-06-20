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
    const accounts = await prisma.ledgerAccount.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(accounts)
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
    const { name, type, isActive } = await req.json()
    if (!name || !type) return NextResponse.json({ error: 'Name and type are required' }, { status: 400 })

    const existing = await prisma.ledgerAccount.findUnique({ where: { name } })
    if (existing) {
      return NextResponse.json({ error: 'Account with this name already exists' }, { status: 409 })
    }

    const account = await prisma.ledgerAccount.create({
      data: {
        name,
        type,
        isActive: isActive !== undefined ? isActive : true,
      }
    })
    return NextResponse.json(account, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
