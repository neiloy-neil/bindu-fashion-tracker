import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { dateOnlyToUtc, newEntryPayloadSchema } from '@/lib/new-entry'
import { logAudit } from '@/lib/audit'
import { signEntryAttachments } from '@/lib/storage'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') // 1-12
  const year = searchParams.get('year')
  const branchId = searchParams.get('branchId')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')

  console.log(`API /entries called: month=${month}, year=${year}, branchId=${branchId}, page=${page}`)

  const userRole = req.headers.get('x-user-role')
  const userBranchId = req.headers.get('x-user-branch-id')
  const userManagedBranches = req.headers.get('x-user-managed-branches')

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
  if (userRole !== 'ADMIN' && userRole !== 'BRANCH') {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'This role cannot create entries' }, { status: 403 })
  }

  if (userRole === 'BRANCH' && !userBranchId) return NextResponse.json({ error: 'FORBIDDEN', message: 'No branch is assigned' }, { status: 403 })
  const finalBranchId = userRole === 'BRANCH' ? Number(userBranchId) : body.branchId

  try {
    const entry = await prisma.$transaction(async tx => {
      const [categories, accounts] = await Promise.all([
        tx.category.findMany({ where: { id: { in: body.items.map(item => item.categoryId) }, isActive: true } }),
        tx.ledgerAccount.findMany({ where: { id: { in: body.transfers.map(transfer => transfer.accountId) } } }),
      ])
      if (categories.length !== body.items.length) throw new Error('One or more income categories are invalid')
      if (new Set(accounts.map(account => account.id)).size !== new Set(body.transfers.map(transfer => transfer.accountId)).size) {
        throw new Error('One or more transfer accounts are invalid')
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

      for (const payment of body.payments) {
        await tx.payment.create({
          data: {
            dailyEntryId: created.id, partyId: payment.partyId, method: payment.method,
            amount: payment.amount, note: payment.note || null, attachmentUrl: payment.attachmentKey || null,
            cheque: payment.method === 'CHEQUE' ? { create: {
              issueDate: dateOnlyToUtc(payment.issueDate!), withdrawDate: dateOnlyToUtc(payment.withdrawDate!), status: 'PENDING',
            } } : undefined,
          },
        })
        if (payment.method !== 'CHEQUE') {
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

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'DUPLICATE_ENTRY', message: 'An entry already exists for this branch and date' }, { status: 409 })
    }
    const message = error instanceof Error ? error.message : 'Entry creation failed'
    return NextResponse.json({ error: 'ENTRY_CREATE_FAILED', message }, { status: 500 })
  }
}
