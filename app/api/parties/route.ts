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
    const parties = await prisma.party.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: { bankInfo: true }
    })
    return NextResponse.json(parties)
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
    const { name, isActive, contactPerson, contactNumber, secondaryNumber, address } = await req.json()
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const existing = await prisma.party.findUnique({ where: { name } })
    if (existing) {
      return NextResponse.json({ error: 'Party with this name already exists' }, { status: 409 })
    }

    const party = await prisma.party.create({
      data: {
        name,
        contactPerson: contactPerson || null,
        contactNumber: contactNumber || null,
        secondaryNumber: secondaryNumber || null,
        address: address || null,
        isActive: isActive !== undefined ? isActive : true,
      }
    })
    return NextResponse.json(party, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
