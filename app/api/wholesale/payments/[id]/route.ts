import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = req.headers.get('x-user-role')
  const userId = req.headers.get('x-user-id')

  if (!role || !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const paymentId = parseInt(id)

  try {
    await prisma.$transaction(async (tx) => {
      const payment = await tx.wholesalePayment.findUnique({
        where: { id: paymentId },
        select: { id: true, amount: true, buyerId: true, challanId: true },
      })
      if (!payment) throw new Error('Payment not found')

      // Restore buyer balance
      await tx.wholesaleBuyer.update({
        where: { id: payment.buyerId },
        data: { balance: { increment: payment.amount } },
      })

      // If tied to a challan, restore its remainingDue and fix status
      if (payment.challanId) {
        const challan = await tx.wholesaleChallan.findUnique({
          where: { id: payment.challanId },
          select: { remainingDue: true, netAmount: true, status: true },
        })
        if (challan && challan.status !== 'CANCELLED') {
          const newRemaining = challan.remainingDue + payment.amount
          const newStatus = newRemaining <= 0 ? 'PAID'
            : newRemaining < challan.netAmount ? 'PARTIALLY_PAID'
            : 'PENDING'
          await tx.wholesaleChallan.update({
            where: { id: payment.challanId },
            data: { remainingDue: newRemaining, status: newStatus },
          })
        }
      }

      await tx.wholesalePayment.delete({ where: { id: paymentId } })
    })

    void logAudit({
      userId: parseInt(userId!),
      action: 'DELETE',
      entityType: 'WholesalePayment',
      entityId: paymentId,
      newValues: { voided: true },
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
