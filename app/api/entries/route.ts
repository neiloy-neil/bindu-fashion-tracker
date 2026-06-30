import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { dateOnlyToUtc, newEntryPayloadSchema } from '@/lib/new-entry'
import { logAudit } from '@/lib/audit'
import { logger } from '@/lib/logger'
import { signEntryAttachments } from '@/lib/storage'
import { sendEmail, partyPaymentPendingEmail } from '@/lib/email'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') // 1-12
  const year = searchParams.get('year')
  const branchId = searchParams.get('branchId')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')

  const userRole = req.headers.get('x-user-role')
  const userBranchId = req.headers.get('x-user-branch-id')
  const userManagedBranches = req.headers.get('x-user-managed-branches')

  if (!userRole) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const where: Record<string, unknown> = {}

  if (year && month) {
    const y = parseInt(year)
    const m = parseInt(month)
    where.date = {
      gte: new Date(y, m - 1, 1),
      lt: new Date(y, m, 1),
    }
  }

  // Force branch filter based on role
  if (userRole === 'BRANCH') {
    if (!userBranchId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    where.branchId = parseInt(userBranchId)
  } else if (userRole === 'AREA_MANAGER') {
    if (!userManagedBranches) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const allowedBranchIds = userManagedBranches.split(',').map(id => parseInt(id))
    if (branchId) {
      if (!allowedBranchIds.includes(parseInt(branchId))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      where.branchId = parseInt(branchId)
    } else {
      where.branchId = { in: allowedBranchIds }
    }
  } else if (branchId) {
    where.branchId = parseInt(branchId)
  }

  const [entries, total] = await Promise.all([
    prisma.dailyEntry.findMany({
      where,
      include: { 
        branch: true,
        items: { include: { category: true } },
        transfers: { include: { account: true } },
        receivedTransfers: { include: { dailyEntry: { include: { branch: true } } } },
        payments: { include: { party: true, cheque: true } },
        expenseEntries: { include: { category: true } },
        advanceSalaries: { include: { employee: true } }
      },
      orderBy: [{ date: 'asc' }, { branchId: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.dailyEntry.count({ where }),
  ])

  return NextResponse.json({ entries: await Promise.all(entries.map(signEntryAttachments)), total, page, limit })
}

export async function POST(req: NextRequest) {
  const parsed = newEntryPayloadSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields', details: parsed.error.flatten() }, { status: 400 })
  }
  const body = parsed.data
  const userRole = req.headers.get('x-user-role')
  const userBranchId = req.headers.get('x-user-branch-id')

  if (!userRole) return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication is required' }, { status: 401 })
  if (!['ADMIN', 'SUPER_ADMIN', 'BRANCH'].includes(userRole)) {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'This role cannot create entries' }, { status: 403 })
  }

  if (userRole === 'BRANCH' && !userBranchId) return NextResponse.json({ error: 'FORBIDDEN', message: 'No branch is assigned' }, { status: 403 })
  const finalBranchId = userRole === 'BRANCH' ? Number(userBranchId) : body.branchId

  try {
    const entry = await prisma.$transaction(async tx => {
      const expenseCatIds = [...new Set(body.expenseEntries.map(e => e.categoryId))]
      const [categories, expenseCategories, accounts] = await Promise.all([
        tx.category.findMany({ where: { id: { in: body.items.map(item => item.categoryId) }, isActive: true, type: 'INCOME' } }),
        expenseCatIds.length > 0
          ? (tx.category as any).findMany({ where: { id: { in: expenseCatIds }, isActive: true, type: 'EXPENSE' } })
          : Promise.resolve([]),
        tx.ledgerAccount.findMany({ where: { id: { in: body.transfers.map(transfer => transfer.accountId) } } }),
      ])
      if (categories.length !== body.items.length) throw new Error('One or more income categories are invalid')
      if (expenseCategories.length !== expenseCatIds.length) throw new Error('One or more expense categories are invalid')
      if (new Set(accounts.map(account => account.id)).size !== new Set(body.transfers.map(transfer => transfer.accountId)).size) {
        throw new Error('One or more transfer accounts are invalid')
      }

      // --- AUTO-TRANSFER DIGITAL SALES ---
      const digitalMethods = ['Bkash', 'Rocket', 'Nagad', 'POS']
      const digitalSales = body.items.map(item => ({
        item, cat: categories.find(c => c.id === item.categoryId)
      })).filter(({ cat }) => cat && digitalMethods.some(m => cat.name.toLowerCase().includes(m.toLowerCase())))

      for (const { item, cat } of digitalSales) {
        if (!cat) continue;
        let account = await tx.ledgerAccount.findFirst({
          where: { name: { equals: cat.name, mode: 'insensitive' } }
        })
        if (!account) {
          account = await tx.ledgerAccount.create({
            data: { name: cat.name, type: 'BANK', isActive: true }
          })
        }
        body.transfers.push({
          accountId: account.id,
          amount: item.amount,
          note: `Auto-transferred from ${cat.name} sale`
        })
      }
      // ------------------------------------

      const openingBalanceCategory = categories.find(c => c.name === 'Opening Balance')
      if (openingBalanceCategory) {
        const openingBalanceItem = body.items.find(item => item.categoryId === openingBalanceCategory.id)
        if (openingBalanceItem) {
          const lastEntry = await tx.dailyEntry.findFirst({
            where: { branchId: finalBranchId, date: { lt: dateOnlyToUtc(body.date) } },
            orderBy: { date: 'desc' },
          })
          const expectedOpeningBalance = lastEntry?.actualPhysicalCash || 0
          if (Math.abs(openingBalanceItem.amount - expectedOpeningBalance) > 0.01) {
            throw new Error(`Opening balance mismatch. Expected ৳${expectedOpeningBalance}, but got ৳${openingBalanceItem.amount}.`)
          }
        }
      }

      const income = body.items.reduce((sum, item) => sum + item.amount, 0)
      const expenses = body.expenseEntries.reduce((sum, item) => sum + item.amount, 0)
      const transfers = body.transfers.reduce((sum, item) => sum + item.amount, 0)
      const payments = body.payments.filter(payment => payment.method !== 'CHEQUE').reduce((sum, item) => sum + item.amount, 0)
      const advances = body.advanceSalaries.filter(advance => advance.type === 'CASH').reduce((sum, item) => sum + item.amount, 0)
      const expectedNetBalance = income - expenses - transfers - payments - advances
      if (body.actualPhysicalCash !== expectedNetBalance && !body.cashDifferenceNote) {
        throw new Error('A cash discrepancy reason is required')
      }

      const created = await tx.dailyEntry.create({
        data: {
          date: dateOnlyToUtc(body.date), branchId: finalBranchId,
          openingTime: body.openingTime, closingTime: body.closingTime,
          notes: body.notes || null, actualPhysicalCash: body.actualPhysicalCash,
          expectedNetBalance: expectedNetBalance,
          cashDifferenceNote: body.cashDifferenceNote || null, eodChecklist: body.eodChecklist,
          items: { create: body.items.map(item => ({
            categoryId: item.categoryId, amount: item.amount, note: item.note || null,
            partyName: item.partyName || null, receiptUrls: item.receiptKeys,
          })) },
          transfers: { create: body.transfers.map(transfer => ({
            ...transfer,
            status: accounts.find(account => account.id === transfer.accountId)?.type === 'BRANCH' ? 'PENDING' : 'NOT_APPLICABLE',
          })) },
          expenseEntries: { create: body.expenseEntries.map(expense => ({
            categoryId: expense.categoryId, amount: expense.amount, note: expense.note || null,
            attachmentUrl: expense.attachmentKey || null,
          })) },
          advanceSalaries: { create: body.advanceSalaries.map(advance => ({
            employeeId: advance.employeeId, type: advance.type, amount: advance.amount,
            productDescription: advance.productDescription || null, note: advance.note || null,
          })) },
        },
      })

      const branchPaymentNeedsApproval = userRole === 'BRANCH'
      for (const payment of body.payments) {
        const needsApproval = payment.method !== 'CHEQUE' && branchPaymentNeedsApproval
        await tx.payment.create({
          data: {
            dailyEntryId: created.id, partyId: payment.partyId, method: payment.method,
            amount: payment.amount, note: payment.note || null, attachmentUrl: payment.attachmentKey || null,
            approvalStatus: needsApproval ? 'PENDING' : 'APPROVED',
            cheque: payment.method === 'CHEQUE' ? { create: {
              issueDate: dateOnlyToUtc(payment.issueDate!), withdrawDate: dateOnlyToUtc(payment.withdrawDate!), status: 'PENDING',
            } } : undefined,
          },
        })
        // Only decrement balance immediately for approved payments
        if (payment.method !== 'CHEQUE' && !needsApproval) {
          await tx.party.update({ where: { id: payment.partyId }, data: { balance: { decrement: payment.amount } } })
        }
      }

      return tx.dailyEntry.findUniqueOrThrow({
        where: { id: created.id }, include: { branch: true, items: { include: { category: true } } },
      })
    })

    const userId = parseInt(req.headers.get('x-user-id') || '0')
    if (userId) {
      await logAudit({
        userId,
        action: 'CREATE',
        entityType: 'DailyEntry',
        entityId: entry.id,
        newValues: entry,
        reason: 'Daily Entry Creation'
      })
    }

    logger.info('entry.created', {
      entryId: entry.id,
      branchId: finalBranchId,
      userId: userId || null,
      transferCount: body.transfers.length,
      paymentCount: body.payments.length,
      advanceCount: body.advanceSalaries.length,
    })

    // Notify admins of pending party payments (fire-and-forget)
    const pendingPayments = body.payments.filter(p => p.method !== 'CHEQUE' && userRole === 'BRANCH')
    if (pendingPayments.length > 0) {
      void (async () => {
        try {
          const [admins, parties] = await Promise.all([
            prisma.user.findMany({ where: { role: 'ADMIN', isActive: true, email: { not: null } }, select: { email: true } }),
            prisma.party.findMany({ where: { id: { in: pendingPayments.map(p => p.partyId) } }, select: { id: true, name: true } }),
          ])
          const partyMap = new Map(parties.map(p => [p.id, p.name]))
          await Promise.all(
            pendingPayments.flatMap(p =>
              admins.map(a => sendEmail({ to: a.email!, ...partyPaymentPendingEmail(entry.branch.name, partyMap.get(p.partyId) ?? `Party #${p.partyId}`, p.amount, p.method) }))
            )
          )
        } catch {}
      })()
    }

    // Trigger async advance salary sync
    if (body.advanceSalaries && body.advanceSalaries.length > 0) {
      const entryDate = new Date(body.date)
      const host = req.headers.get('host') || 'localhost:3000'
      const proto = req.headers.get('x-forwarded-proto') || 'http'
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`
      try {
        await fetch(`${appUrl}/api/hr/sync/advance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-role': 'ADMIN' },
          body: JSON.stringify({
            month: entryDate.getMonth() + 1,
            year: entryDate.getFullYear(),
          })
        })
      } catch (error) {
        logger.error('entry.advance_sync_background_failed', error, {
          entryId: entry.id,
          branchId: finalBranchId,
          month: entryDate.getMonth() + 1,
          year: entryDate.getFullYear(),
        })
      }
    }

    // Fire in-app notifications for branch-to-branch transfers (fire-and-forget)
    if (body.transfers && body.transfers.length > 0) {
      void (async () => {
        try {
          // Get created transfer IDs and account details
          const createdEntry = await prisma.dailyEntry.findUnique({
            where: { id: entry.id },
            include: {
              transfers: { include: { account: { include: { branch: true } } } },
              branch: { select: { name: true } },
            },
          })
          if (!createdEntry) return

          for (const transfer of createdEntry.transfers) {
            if (transfer.status !== 'PENDING') continue
            const receivingBranchId = transfer.account.branchId
            if (!receivingBranchId) continue

            // Find all active BRANCH users for the receiving branch
            const receivingUsers = await prisma.user.findMany({
              where: {
                branchId: receivingBranchId,
                isActive: true,
                role: { in: ['BRANCH', 'ADMIN', 'SUPER_ADMIN'] },
              },
              select: { id: true },
            })

            if (receivingUsers.length === 0) continue

            await prisma.notification.createMany({
              data: receivingUsers.map(u => ({
                userId: u.id,
                type: 'TRANSFER_INCOMING',
                title: `Incoming Transfer from ${createdEntry.branch.name}`,
                body: `৳${transfer.amount.toLocaleString()} via ${transfer.account.name}${transfer.note ? ` — "${transfer.note}"` : ''}`,
                metadata: {
                  transferId: transfer.id,
                  amount: transfer.amount,
                  senderBranch: createdEntry.branch.name,
                  accountName: transfer.account.name,
                },
              })),
            })
          }
        } catch { /* non-critical, swallow */ }
      })()
    }

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    logger.error('entry.create_failed', error, {
      branchId: finalBranchId,
      userRole,
    })
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'DUPLICATE_ENTRY', message: 'An entry already exists for this branch and date' }, { status: 409 })
    }
    const message = error instanceof Error ? error.message : 'Entry creation failed'
    return NextResponse.json({ error: 'ENTRY_CREATE_FAILED', message }, { status: 500 })
  }
}
