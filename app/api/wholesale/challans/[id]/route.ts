import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

const ALLOWED_ROLES = ['ADMIN', 'SUPER_ADMIN', 'BRANCH', 'ACCOUNTS', 'AREA_MANAGER', 'AUDITOR']

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = req.headers.get('x-user-role')
  if (!role || !ALLOWED_ROLES.includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const challan = await prisma.wholesaleChallan.findUnique({
    where: { id: parseInt(id) },
    include: {
      buyer: { include: { bankInfo: true } },
      branch: true,
      items: true,
      payments: { orderBy: { collectedAt: 'desc' } },
      returns: { orderBy: { date: 'desc' } },
    },
  })
  if (!challan) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(challan)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = req.headers.get('x-user-role')
  const userId = req.headers.get('x-user-id')

  if (!role || !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  try {
    const data = await req.json()
    const challan = await prisma.wholesaleChallan.update({
      where: { id: parseInt(id) },
      data: {
        status: data.status,
        notes: data.notes,
        deliveryPerson: data.deliveryPerson,
        attachmentUrl: data.attachmentUrl,
      },
    })

    void logAudit({
      userId: parseInt(userId!),
      action: 'UPDATE',
      entityType: 'WholesaleChallan',
      entityId: challan.id,
      newValues: data,
    }).catch(() => {})

    return NextResponse.json(challan)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = req.headers.get('x-user-role')
  const userId = req.headers.get('x-user-id')

  if (!role || !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  try {
    // Quick pre-check (outside tx) — full authoritative read is inside the transaction
    const preCheck = await prisma.wholesaleChallan.findUnique({
      where: { id: parseInt(id) },
      select: { status: true },
    })
    if (!preCheck) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (preCheck.status === 'PAID') {
      return NextResponse.json({ error: 'Cannot cancel a fully paid challan.' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      // Re-fetch inside tx to get a consistent remainingDue (guards against concurrent payments)
      const challan = await tx.wholesaleChallan.findUnique({
        where: { id: parseInt(id) },
        select: { status: true, remainingDue: true, buyerId: true },
      })
      if (!challan || challan.status === 'CANCELLED') return

      await tx.wholesaleChallan.update({
        where: { id: parseInt(id) },
        data: { status: 'CANCELLED' },
      })
      // Reverse the outstanding balance — clamp to 0 to avoid going negative
      if (challan.remainingDue > 0) {
        const buyer = await tx.wholesaleBuyer.findUnique({ where: { id: challan.buyerId }, select: { balance: true } })
        const newBalance = Math.max(0, (buyer?.balance ?? 0) - challan.remainingDue)
        await tx.wholesaleBuyer.update({
          where: { id: challan.buyerId },
          data: { balance: newBalance },
        })
      }
    })

    void logAudit({
      userId: parseInt(userId!),
      action: 'UPDATE',
      entityType: 'WholesaleChallan',
      entityId: parseInt(id),
      newValues: { status: 'CANCELLED' },
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
