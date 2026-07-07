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
  const challanId = searchParams.get('challanId')
  const branchId = searchParams.get('branchId')

  let where: any = {}
  if (role === 'BRANCH' && userBranchId) where.branchId = parseInt(userBranchId)
  else if (branchId) where.branchId = parseInt(branchId)
  if (challanId) where.challanId = parseInt(challanId)

  try {
    const returns = await prisma.wholesaleReturn.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        challan: { select: { id: true, challanNumber: true, buyer: { select: { id: true, name: true } } } },
      },
    })
    return NextResponse.json(returns)
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
    const { challanId, branchId: bodyBranchId, date, amount, reason, attachmentUrl } = await req.json()

    if (!challanId || !amount || !date) {
      return NextResponse.json({ error: 'challanId, date, and amount are required.' }, { status: 400 })
    }

    const finalBranchId = role === 'BRANCH' ? parseInt(userBranchId!) : parseInt(bodyBranchId)
    const returnAmount = parseFloat(amount)

    const ret = await prisma.$transaction(async (tx) => {
      const challan = await tx.wholesaleChallan.findUnique({
        where: { id: parseInt(challanId) },
        select: { remainingDue: true, buyerId: true, status: true },
      })
      if (!challan) throw new Error('Challan not found')
      if (challan.status === 'CANCELLED') throw new Error('Cannot process return on a cancelled challan')
      if (challan.status === 'PAID') throw new Error('Cannot process return on a fully paid challan')

      const newReturn = await tx.wholesaleReturn.create({
        data: {
          challanId: parseInt(challanId),
          branchId: finalBranchId,
          date: new Date(date),
          amount: returnAmount,
          reason: reason || null,
          attachmentUrl: attachmentUrl || null,
          processedById: parseInt(userId!),
        },
      })

      // Reduce buyer balance — clamp to 0 to avoid negative balance
      const buyer = await tx.wholesaleBuyer.findUnique({ where: { id: challan.buyerId }, select: { balance: true } })
      const newBalance = Math.max(0, (buyer?.balance ?? 0) - returnAmount)
      await tx.wholesaleBuyer.update({
        where: { id: challan.buyerId },
        data: { balance: newBalance },
      })

      // Clamp remainingDue to 0 and update status
      const newRemaining = Math.max(0, challan.remainingDue - returnAmount)
      const newStatus = newRemaining <= 0 ? 'PAID' : challan.status
      await tx.wholesaleChallan.update({
        where: { id: parseInt(challanId) },
        data: { remainingDue: newRemaining, status: newStatus },
      })

      return newReturn
    })

    void logAudit({
      userId: parseInt(userId!),
      action: 'CREATE',
      entityType: 'WholesaleReturn',
      entityId: ret.id,
      newValues: { challanId, amount: returnAmount },
    }).catch(() => {})

    return NextResponse.json(ret, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
