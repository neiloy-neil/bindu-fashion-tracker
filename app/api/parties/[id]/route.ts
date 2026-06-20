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
    
    if (name) {
      const existing = await prisma.party.findFirst({ where: { name, id: { not: id } } })
      if (existing) {
        return NextResponse.json({ error: 'Party with this name already exists' }, { status: 409 })
      }
    }

    const party = await prisma.party.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(isActive !== undefined && { isActive }),
      }
    })
    return NextResponse.json(party)
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
    const paymentsCount = await prisma.payment.count({ where: { partyId: id } })
    if (paymentsCount > 0) {
      return NextResponse.json({ error: 'Cannot delete party because it is referenced in payments. Please deactivate it instead.' }, { status: 409 })
    }

    const party = await prisma.party.delete({ where: { id } })
    return NextResponse.json(party)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
