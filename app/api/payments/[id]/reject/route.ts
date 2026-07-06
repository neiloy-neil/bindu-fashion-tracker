import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { notifyBranchUsers } from '@/lib/notify'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userRole = req.headers.get('x-user-role')
  const userIdStr = req.headers.get('x-user-id')
  if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole ?? '') || !userIdStr) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const userId = parseInt(userIdStr, 10)
  const { id } = await params
  const paymentId = parseInt(id, 10)
  if (isNaN(paymentId)) return NextResponse.json({ error: 'Invalid payment ID' }, { status: 400 })

  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { dailyEntry: { select: { branchId: true } } },
    })
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    if (payment.approvalStatus !== 'PENDING') return NextResponse.json({ error: 'Payment is already processed' }, { status: 409 })

    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: { approvalStatus: 'REJECTED' },
    })

    await logAudit({ userId, action: 'UPDATE', entityType: 'Payment', entityId: paymentId, newValues: updated, reason: 'Party payment rejected' })

    const branchId = (payment as any).dailyEntry?.branchId
    if (branchId) {
      void notifyBranchUsers(
        branchId,
        'PAYMENT_UPDATE',
        'Party payment rejected',
        'A party payment has been rejected.',
        { paymentId }
      ).catch(() => {})
    }

    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 })
  }
}
