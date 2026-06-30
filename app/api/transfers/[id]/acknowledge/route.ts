import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { dateOnlyToUtc, dhakaDateString } from '@/lib/new-entry'

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

    // Verify ownership
    if (role !== 'ADMIN') {
      if (transfer.account.type !== 'BRANCH' || transfer.account.branchId !== userBranchId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    if (action === 'REJECT') {
      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.transfer.updateMany({
          where: { id: transferId, status: 'PENDING' },
          data: {
            status: 'REJECTED',
            rejectionReason,
            acknowledgedById: Number(userId),
            acknowledgedAt: new Date()
          }
        })

        if (result.count !== 1) {
          const latest = await tx.transfer.findUnique({ where: { id: transferId } })
          throw new Error(`Transfer is already ${latest?.status ?? 'UNKNOWN'}`)
        }

        return tx.transfer.findUniqueOrThrow({ where: { id: transferId } })
      })

      return NextResponse.json(updated)
    }

    // Find or create today's DailyEntry for the receiving branch
    if (!transfer.account.branchId) {
      return NextResponse.json({ error: 'Transfer account is not linked to a branch' }, { status: 400 })
    }

    const today = dateOnlyToUtc(dhakaDateString())
    
    const updated = await prisma.$transaction(async (tx) => {
      const dailyEntry = await tx.dailyEntry.upsert({
        where: {
          date_branchId: {
            date: today,
            branchId: transfer.account.branchId!
          }
        },
        update: {},
        create: {
          date: today,
          branchId: transfer.account.branchId!
        }
      })

      const result = await tx.transfer.updateMany({
        where: { id: transferId, status: 'PENDING' },
        data: {
          status: 'ACKNOWLEDGED',
          acknowledgedById: Number(userId),
          acknowledgedAt: new Date(),
          receivingEntryId: dailyEntry.id
        }
      })

      if (result.count !== 1) {
        const latest = await tx.transfer.findUnique({ where: { id: transferId } })
        throw new Error(`Transfer is already ${latest?.status ?? 'UNKNOWN'}`)
      }

      // Ensure system categories exist
      const incomeCategory = await tx.category.upsert({
        where: { name: 'Branch Transfer Received' },
        update: {},
        create: { name: 'Branch Transfer Received', type: 'INCOME', isDefault: true, isActive: true }
      })

      const expenseCategory = await tx.category.upsert({
        where: { name: 'Branch Transfer Sent' },
        update: {},
        create: { name: 'Branch Transfer Sent', type: 'EXPENSE', isDefault: true, isActive: true, frequency: 'DAILY' }
      })

      // 1. Auto-book income on the receiving branch (today's entry)
      const existingIncome = await tx.entryItem.findUnique({
        where: {
          entryId_categoryId: { entryId: dailyEntry.id, categoryId: incomeCategory.id }
        }
      })

      if (existingIncome) {
        await tx.entryItem.update({
          where: { id: existingIncome.id },
          data: { amount: { increment: transfer.amount } }
        })
      } else {
        await tx.entryItem.create({
          data: {
            entryId: dailyEntry.id,
            categoryId: incomeCategory.id,
            amount: transfer.amount,
            note: `Auto-booked transfer from via ${transfer.account.name}`
          }
        })
      }

      // 2. Auto-book expense on the sending branch (original entry)
      await tx.expenseEntry.create({
        data: {
          dailyEntryId: transfer.dailyEntryId,
          categoryId: expenseCategory.id,
          amount: transfer.amount,
          note: `Auto-booked transfer via ${transfer.account.name}`,
          isTransferEntry: true
        }
      })

      return tx.transfer.findUniqueOrThrow({ where: { id: transferId } })
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Transfer is already ')) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to acknowledge transfer' }, { status: 500 })
  }
}
