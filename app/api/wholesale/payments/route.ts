import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

const ALLOWED_ROLES = ['ADMIN', 'SUPER_ADMIN', 'BRANCH', 'ACCOUNTS']

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  const userBranchId = req.headers.get('x-user-branch-id')

  if (!role || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const buyerId = searchParams.get('buyerId')
  const challanId = searchParams.get('challanId')
  const branchId = searchParams.get('branchId')

  let where: any = {}
  if (role === 'BRANCH' && userBranchId) where.branchId = parseInt(userBranchId)
  else if (branchId) where.branchId = parseInt(branchId)
  if (buyerId) where.buyerId = parseInt(buyerId)
  if (challanId) where.challanId = parseInt(challanId)

  try {
    const payments = await prisma.wholesalePayment.findMany({
      where,
      orderBy: { collectedAt: 'desc' },
      include: {
        buyer: { select: { id: true, name: true } },
        challan: { select: { id: true, challanNumber: true } },
      },
    })
    return NextResponse.json(payments)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  const userId = req.headers.get('x-user-id')
  const userBranchId = req.headers.get('x-user-branch-id')

  if (!role || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { buyerId, challanId, branchId: bodyBranchId, method, amount, transactionRef, note, attachmentUrl, buyerBankInfoId, collectedAt } = await req.json()

    if (!buyerId || !method || !amount) {
      return NextResponse.json({ error: 'buyerId, method, and amount are required.' }, { status: 400 })
    }

    const finalBranchId = role === 'BRANCH' ? parseInt(userBranchId!) : parseInt(bodyBranchId)
    const paymentAmount = parseFloat(amount)

    const payment = await prisma.$transaction(async (tx) => {
      const newPayment = await tx.wholesalePayment.create({
        data: {
          buyerId: parseInt(buyerId),
          challanId: challanId ? parseInt(challanId) : null,
          branchId: finalBranchId,
          method,
          amount: paymentAmount,
          transactionRef: transactionRef || null,
          note: note || null,
          attachmentUrl: attachmentUrl || null,
          buyerBankInfoId: buyerBankInfoId ? parseInt(buyerBankInfoId) : null,
          collectedById: parseInt(userId!),
          collectedAt: collectedAt ? new Date(collectedAt) : new Date(),
        },
      })

      // Decrease buyer outstanding balance — clamp to 0 to avoid negative balance
      const buyer = await tx.wholesaleBuyer.findUnique({ where: { id: parseInt(buyerId) }, select: { balance: true } })
      const newBalance = Math.max(0, (buyer?.balance ?? 0) - paymentAmount)
      await tx.wholesaleBuyer.update({
        where: { id: parseInt(buyerId) },
        data: { balance: newBalance },
      })

      // If tied to a challan, verify ownership then update remainingDue and status
      if (challanId) {
        const challan = await tx.wholesaleChallan.findUnique({
          where: { id: parseInt(challanId) },
          select: { remainingDue: true, netAmount: true, branchId: true },
        })
        if (challan) {
          if (challan.branchId !== finalBranchId) throw new Error('Challan does not belong to this branch')
          const newRemaining = Math.max(0, challan.remainingDue - paymentAmount)
          const newStatus = newRemaining <= 0 ? 'PAID' : 'PARTIALLY_PAID'
          await tx.wholesaleChallan.update({
            where: { id: parseInt(challanId) },
            data: { remainingDue: newRemaining, status: newStatus },
          })
        }
      }

      return newPayment
    })

    void logAudit({
      userId: parseInt(userId!),
      action: 'CREATE',
      entityType: 'WholesalePayment',
      entityId: payment.id,
      newValues: { buyerId, challanId, method, amount: paymentAmount },
    }).catch(() => {})

    return NextResponse.json(payment, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
