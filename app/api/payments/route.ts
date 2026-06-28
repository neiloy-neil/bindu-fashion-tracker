import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { directPaymentSchema } from '@/lib/schemas'

export async function GET(req: NextRequest) {
  const userRole = req.headers.get('x-user-role')
  if (userRole !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const approvalStatus = searchParams.get('approvalStatus') || 'PENDING'

  const payments = await prisma.payment.findMany({
    where: { approvalStatus, method: { not: 'CHEQUE' } },
    include: { party: true, dailyEntry: { include: { branch: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(payments)
}

export async function POST(req: NextRequest) {
  const userRole = req.headers.get('x-user-role')
  const userBranchId = req.headers.get('x-user-branch-id')

  if (!userRole) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const parsed = directPaymentSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 })
    }
    const { dailyEntryId, partyId, method, amount, note, issueDate, withdrawDate, attachmentUrl } = parsed.data

    const parsedDailyEntryId = dailyEntryId ?? null

    // If dailyEntryId is provided, verify branch ownership
    if (parsedDailyEntryId) {
      const entry = await prisma.dailyEntry.findUnique({ where: { id: parsedDailyEntryId } })
      if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

      if (userRole === 'BRANCH' && String(entry.branchId) !== String(userBranchId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
      // If no dailyEntryId, it's a direct admin payment
      if (userRole !== 'ADMIN') {
        return NextResponse.json({ error: 'Only admins can make direct payments without a daily entry.' }, { status: 403 })
      }
    }

    const isAdminRole = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'
    const needsApproval = !isAdminRole || method === 'CHEQUE'

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          dailyEntryId: parsedDailyEntryId,
          partyId,
          method,
          amount,
          note: note || null,
          attachmentUrl: attachmentUrl || null,
          approvalStatus: needsApproval ? 'PENDING' : 'APPROVED',
        }
      })

      if (method === 'CHEQUE') {
        // Party.balance is NOT updated here for cheques; it updates when the admin approves the cheque.
        await tx.cheque.create({
          data: {
            paymentId: payment.id,
            issueDate: new Date(issueDate!),
            withdrawDate: new Date(withdrawDate!),
            status: 'PENDING'
          }
        })
      } else if (!needsApproval) {
        // Only decrement balance immediately for APPROVED payments (admin-created)
        await tx.party.update({
          where: { id: partyId },
          data: { balance: { decrement: amount } }
        })
      }

      return payment
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
