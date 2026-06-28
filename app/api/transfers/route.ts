import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { transferMutationSchema } from '@/lib/schemas'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { role: userRole, branchId: userBranchId } = session.user

  try {
    const parsed = transferMutationSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 })
    }
    const { dailyEntryId, accountId, amount, note } = parsed.data

    const entry = await prisma.dailyEntry.findUnique({ where: { id: dailyEntryId } })
    if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

    if (userRole === 'BRANCH' && entry.branchId !== userBranchId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const account = await prisma.ledgerAccount.findUnique({ where: { id: accountId } })
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

    if (!account.isActive) {
      return NextResponse.json({ error: 'This account is no longer active' }, { status: 400 })
    }

    if (account.type === 'BRANCH' && account.branchId !== null && account.branchId === entry.branchId) {
      return NextResponse.json({ error: 'Cannot transfer to own branch' }, { status: 400 })
    }

    const status = account.type === 'BRANCH' ? 'PENDING' : 'NOT_APPLICABLE'

    const transfer = await prisma.transfer.create({
      data: {
        dailyEntryId,
        accountId,
        amount,
        note: note || null,
        status,
      }
    })

    return NextResponse.json(transfer, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
