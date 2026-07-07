import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = req.headers.get('x-user-role')
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const buyer = await prisma.wholesaleBuyer.findUnique({
    where: { id: parseInt(id) },
    include: {
      bankInfo: true,
      branch: { select: { id: true, name: true } },
      challans: { orderBy: { date: 'desc' }, take: 20, include: { items: true, returns: { select: { id: true, amount: true, date: true, reason: true } } } },
      payments: { orderBy: { collectedAt: 'desc' }, take: 20 },
    },
  })
  if (!buyer) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(buyer)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = req.headers.get('x-user-role')
  if (!role || !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  try {
    const data = await req.json()
    const buyer = await prisma.wholesaleBuyer.update({
      where: { id: parseInt(id) },
      data: {
        name: data.name,
        contactPerson: data.contactPerson ?? null,
        contactNumber: data.contactNumber ?? null,
        secondaryNumber: data.secondaryNumber ?? null,
        email: data.email ?? null,
        address: data.address ?? null,
        creditLimit: data.creditLimit !== undefined ? parseFloat(data.creditLimit) : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
        branchId: data.branchId !== undefined ? (data.branchId ? parseInt(data.branchId) : null) : undefined,
      },
    })
    return NextResponse.json(buyer)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = req.headers.get('x-user-role')
  if (!role || !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  try {
    await prisma.wholesaleBuyer.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
