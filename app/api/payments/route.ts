import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const userRole = req.headers.get('x-user-role')
  const userBranchId = req.headers.get('x-user-branch-id')

  if (!userRole) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const { dailyEntryId, partyId, method, amount, note, issueDate, withdrawDate, attachmentUrl } = await req.json()

    if ((method === 'BANK' || method === 'CHEQUE') && !attachmentUrl) {
      return NextResponse.json({ error: 'A payslip attachment is required for bank transfer and cheque payments.' }, { status: 400 })
    }

    let parsedDailyEntryId = dailyEntryId ? parseInt(dailyEntryId) : null

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

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          dailyEntryId: parsedDailyEntryId,
          partyId: parseInt(partyId),
          method,
          amount: parseFloat(amount),
          note: note || null,
          attachmentUrl: attachmentUrl || null,
        }
      })

      if (method === 'CHEQUE') {
        // Create pending cheque
        // Party.balance is NOT updated here for cheques; it updates when the admin approves the cheque.
        await tx.cheque.create({
          data: {
            paymentId: payment.id,
            issueDate: new Date(issueDate),
            withdrawDate: new Date(withdrawDate),
            status: 'PENDING'
          }
        })
      } else {
        // Immediately decrement party balance for CASH/BANK (because payment reduces our debt to them)
        await tx.party.update({
          where: { id: parseInt(partyId) },
          data: { balance: { decrement: parseFloat(amount) } }
        })
      }

      return payment
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
