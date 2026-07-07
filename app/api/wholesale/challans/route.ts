import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

const ALLOWED_ROLES = ['ADMIN', 'SUPER_ADMIN', 'BRANCH', 'ACCOUNTS', 'AREA_MANAGER', 'AUDITOR']

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  const userBranchId = req.headers.get('x-user-branch-id')

  if (!role || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get('branchId')
  const buyerId = searchParams.get('buyerId')
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  try {
    let whereClause: any = {}

    if (role === 'BRANCH' && userBranchId) {
      whereClause.branchId = parseInt(userBranchId)
    } else if (branchId) {
      whereClause.branchId = parseInt(branchId)
    }

    if (buyerId) whereClause.buyerId = parseInt(buyerId)
    if (status) whereClause.status = status

    const [challans, total] = await Promise.all([
      prisma.wholesaleChallan.findMany({
        where: whereClause,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          buyer: { select: { id: true, name: true, contactNumber: true } },
          branch: { select: { id: true, name: true } },
          items: true,
          payments: { orderBy: { collectedAt: 'desc' } },
          returns: true,
        },
      }),
      prisma.wholesaleChallan.count({ where: whereClause }),
    ])

    return NextResponse.json({ challans, total, page, limit })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  const userId = req.headers.get('x-user-id')
  const userBranchId = req.headers.get('x-user-branch-id')

  if (!role || !['ADMIN', 'SUPER_ADMIN', 'BRANCH'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const {
      buyerId,
      branchId: bodyBranchId,
      date,
      items,
      discount,
      paidAtDelivery,
      deliveryPerson,
      notes,
      attachmentUrl,
    } = body

    if (!buyerId || !items || !items.length || !date) {
      return NextResponse.json({ error: 'buyerId, date, and at least one item are required.' }, { status: 400 })
    }

    const finalBranchId = role === 'BRANCH' ? parseInt(userBranchId!) : parseInt(bodyBranchId)
    if (!finalBranchId) {
      return NextResponse.json({ error: 'Branch is required.' }, { status: 400 })
    }

    const totalAmount = items.reduce((sum: number, item: any) => sum + parseFloat(item.amount || 0), 0)
    const discountAmt = parseFloat(discount || 0)
    const netAmount = totalAmount - discountAmt
    const paidAmt = parseFloat(paidAtDelivery || 0)
    const remainingDue = netAmount - paidAmt

    // Branch code fetched outside tx (read-only, stable)
    const branch = await prisma.branch.findUnique({ where: { id: finalBranchId }, select: { code: true, name: true } })
    const branchCode = branch?.code || branch?.name?.substring(0, 3).toUpperCase() || 'WS'
    // BST year for challan number
    const bstYear = new Date(new Date().getTime() + 6 * 60 * 60 * 1000).getUTCFullYear()

    const challan = await prisma.$transaction(async (tx) => {
      // Count inside transaction to prevent duplicate challan numbers under concurrent requests
      const count = await tx.wholesaleChallan.count({ where: { branchId: finalBranchId } })
      const challanNumber = `${branchCode}-${bstYear}-${String(count + 1).padStart(4, '0')}`

      const newChallan = await tx.wholesaleChallan.create({
        data: {
          challanNumber,
          buyerId: parseInt(buyerId),
          branchId: finalBranchId,
          date: new Date(date),
          totalAmount,
          discount: discountAmt,
          netAmount,
          paidAtDelivery: paidAmt,
          remainingDue,
          deliveryPerson: deliveryPerson || null,
          notes: notes || null,
          attachmentUrl: attachmentUrl || null,
          status: remainingDue <= 0 ? 'PAID' : paidAmt > 0 ? 'PARTIALLY_PAID' : 'PENDING',
          createdById: parseInt(userId!),
          items: {
            create: items.map((item: any) => ({
              description: item.description,
              quantity: item.quantity ? parseFloat(item.quantity) : null,
              unitPrice: item.unitPrice ? parseFloat(item.unitPrice) : null,
              amount: parseFloat(item.amount),
              note: item.note || null,
            })),
          },
        },
        include: { items: true },
      })

      // Increase buyer balance by remainingDue
      await tx.wholesaleBuyer.update({
        where: { id: parseInt(buyerId) },
        data: { balance: { increment: remainingDue } },
      })

      // Record delivery payment if any
      if (paidAmt > 0) {
        await tx.wholesalePayment.create({
          data: {
            buyerId: parseInt(buyerId),
            challanId: newChallan.id,
            branchId: finalBranchId,
            method: 'CASH',
            amount: paidAmt,
            note: 'Paid at delivery',
            collectedById: parseInt(userId!),
          },
        })
      }

      return newChallan
    })

    void logAudit({
      userId: parseInt(userId!),
      action: 'CREATE',
      entityType: 'WholesaleChallan',
      entityId: challan.id,
      newValues: { challanNumber, buyerId, netAmount, remainingDue },
    }).catch(() => {})

    return NextResponse.json(challan, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
