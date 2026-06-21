import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const userRole = req.headers.get('x-user-role')
  const userBranchId = req.headers.get('x-user-branch-id')

  if (!userRole) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const { dailyEntryId, accountId, amount, note } = await req.json()

    // Verify branch ownership
    const entry = await prisma.dailyEntry.findUnique({ where: { id: parseInt(dailyEntryId) } })
    if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

    if (userRole === 'BRANCH' && String(entry.branchId) !== String(userBranchId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const account = await prisma.ledgerAccount.findUnique({ where: { id: parseInt(accountId) } })
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

    const status = account.type === 'BRANCH' ? 'PENDING' : 'NOT_APPLICABLE'

    const transfer = await prisma.transfer.create({
      data: {
        dailyEntryId: parseInt(dailyEntryId),
        accountId: parseInt(accountId),
        amount: parseFloat(amount),
        note,
        status,
      }
    })

    return NextResponse.json(transfer, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
