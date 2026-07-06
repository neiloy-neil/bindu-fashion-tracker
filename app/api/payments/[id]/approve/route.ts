import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { notifyBranchUsers } from '@/lib/notify'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userRole = req.headers.get('x-user-role')
  const userIdStr = req.headers.get('x-user-id')
  if (userRole !== 'ADMIN' || !userIdStr) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const userId = parseInt(userIdStr, 10)
  const { id } = await params
  const paymentId = parseInt(id, 10)
  if (isNaN(paymentId)) return NextResponse.json({ error: 'Invalid payment ID' }, { status: 400 })

  try {
    const result = await prisma.$transaction(async tx => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { dailyEntry: { select: { branchId: true } } },
      })
      if (!payment) throw new Error('Payment not found')
      if (payment.approvalStatus !== 'PENDING') throw new Error('Payment is already processed')

      const updated = await tx.payment.update({
        where: { id: paymentId },
        data: { approvalStatus: 'APPROVED' },
      })
      await tx.party.update({
        where: { id: payment.partyId },
        data: { balance: { decrement: payment.amount } },
      })
      return { updated, branchId: payment.dailyEntry?.branchId ?? null }
    })

    await logAudit({ userId, action: 'UPDATE', entityType: 'Payment', entityId: paymentId, newValues: result.updated, reason: 'Party payment approved' })

    if (result.branchId) {
      void notifyBranchUsers(
        result.branchId,
        'PAYMENT_UPDATE',
        'Party payment approved',
        `A party payment has been approved.`,
        { paymentId }
      ).catch(() => {})
    }

    return NextResponse.json(result.updated)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 })
  }
}
