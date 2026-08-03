import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { getReqPerms, FORBIDDEN } from '@/lib/server-auth'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getReqPerms(req)
  if (!auth || !auth.perms['wholesale.write']) return FORBIDDEN()
  const { userId } = auth

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
      userId: userId,
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
