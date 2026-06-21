import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { role, branchId: userBranchId, id: userId } = session.user
  const { id } = await params
  const transferId = parseInt(id)

  if (isNaN(transferId)) {
    return NextResponse.json({ error: 'Invalid transfer ID' }, { status: 400 })
  }

  try {
    const { action, rejectionReason } = await request.json()

    if (action !== 'ACKNOWLEDGE' && action !== 'REJECT') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    if (action === 'REJECT' && !rejectionReason) {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 })
    }

    // Fetch the transfer
    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
      include: {
        account: true,
      }
    })

    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 })
    }

    if (transfer.status !== 'PENDING') {
      return NextResponse.json({ error: 'Transfer is already ' + transfer.status }, { status: 409 })
    }

    // Verify ownership
    if (role !== 'ADMIN') {
      if (transfer.account.type !== 'BRANCH' || transfer.account.branchId !== userBranchId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    if (action === 'REJECT') {
      const updated = await prisma.transfer.update({
        where: { id: transferId },
        data: {
          status: 'REJECTED',
          rejectionReason,
          acknowledgedById: Number(userId),
          acknowledgedAt: new Date()
        }
      })
      return NextResponse.json(updated)
    }

    // Find or create today's DailyEntry for the receiving branch
    if (!transfer.account.branchId) {
      return NextResponse.json({ error: 'Transfer account is not linked to a branch' }, { status: 400 })
    }

    // To find today's entry, we align with the timezone. Assuming local server timezone.
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const updated = await prisma.$transaction(async (tx) => {
      let dailyEntry = await tx.dailyEntry.findUnique({
        where: {
          date_branchId: {
            date: today,
            branchId: transfer.account.branchId!
          }
        }
      })

      if (!dailyEntry) {
        dailyEntry = await tx.dailyEntry.create({
          data: {
            date: today,
            branchId: transfer.account.branchId!
          }
        })
      }

      const updatedTransfer = await tx.transfer.update({
        where: { id: transferId },
        data: {
          status: 'ACKNOWLEDGED',
          acknowledgedById: Number(userId),
          acknowledgedAt: new Date(),
          receivingEntryId: dailyEntry.id
        }
      })

      return updatedTransfer
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to acknowledge transfer:', error)
    return NextResponse.json({ error: 'Failed to acknowledge transfer' }, { status: 500 })
  }
}
