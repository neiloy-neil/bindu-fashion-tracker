import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userRole = req.headers.get('x-user-role')
  if (!userRole) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const resolvedParams = await params
  const id = parseInt(resolvedParams.id)

  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const dateFilter = startDate && endDate ? {
    gte: new Date(startDate + 'T00:00:00.000+06:00'),
    lte: new Date(endDate + 'T23:59:59.999+06:00'),
  } : undefined

  try {
    // If date filter applied, calculate the balance before the filter window
    let preFilterBalance = 0
    if (dateFilter) {
      const [prePurchases, prePayments] = await Promise.all([
        prisma.purchase.findMany({
          where: { partyId: id, date: { lt: dateFilter.gte } },
          select: { amount: true },
        }),
        prisma.payment.findMany({
          where: { partyId: id, approvalStatus: 'APPROVED', createdAt: { lt: dateFilter.gte } },
          select: { amount: true },
        }),
      ])
      preFilterBalance = prePurchases.reduce((s, p) => s + p.amount, 0)
        - prePayments.reduce((s, p) => s + p.amount, 0)
    }

    const [purchases, payments] = await Promise.all([
      prisma.purchase.findMany({
        where: { partyId: id, ...(dateFilter ? { date: dateFilter } : {}) },
        select: {
          id: true, date: true, amount: true,
          invoiceNumber: true, note: true, attachmentUrl: true,
          isOpeningDue: true, createdAt: true,
        },
        orderBy: { date: 'asc' },
        take: 2000,
      }),
      prisma.payment.findMany({
        where: { partyId: id, ...(dateFilter ? { createdAt: dateFilter } : {}) },
        select: {
          id: true, amount: true, method: true, approvalStatus: true,
          note: true, attachmentUrl: true, createdAt: true, transactionRef: true,
          cheque: {
            select: { id: true, issueDate: true, withdrawDate: true, status: true },
          },
          partyBankInfo: {
            select: { type: true, label: true, accountNo: true, accountName: true },
          },
          dailyEntry: {
            select: {
              date: true,
              branch: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: 2000,
      }),
    ])

    // Interleave them by date
    const ledger: any[] = []

    for (const p of purchases) {
      ledger.push({
        type: 'PURCHASE',
        id: p.id,
        date: p.date,
        amount: p.amount, // debit
        invoiceNumber: p.invoiceNumber,
        note: p.note,
        attachmentUrl: p.attachmentUrl,
        isOpeningDue: p.isOpeningDue,
        createdAt: p.createdAt
      })
    }

    for (const p of payments) {
      // For payments, use the daily entry date if available, else createdAt.
      // Or we can just use createdAt for everything. But for purchases we use `date`.
      // Let's use `p.dailyEntry?.date` if it's tied to an entry, otherwise `p.issueDate` or `createdAt`?
      // Wait, payments have an `issueDate`? No, cheques have an issueDate. The Payment itself has createdAt.
      // But if it's tied to a daily entry, it corresponds to that day's business date.
      const paymentDate = p.dailyEntry?.date || p.createdAt

      ledger.push({
        type: 'PAYMENT',
        id: p.id,
        date: paymentDate,
        amount: p.amount, // credit
        method: p.method,
        approvalStatus: p.approvalStatus,
        note: p.note,
        attachmentUrl: p.attachmentUrl,
        cheque: p.cheque,
        partyBankInfo: p.partyBankInfo,
        transactionRef: p.transactionRef,
        branch: p.dailyEntry?.branch,
        createdAt: p.createdAt
      })
    }

    // Sort by date asc
    ledger.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Calculate running balance — seed with pre-filter balance if a date range is active
    let runningBalance = preFilterBalance
    const ledgerWithBalance = ledger.map(item => {
      if (item.type === 'PURCHASE') {
        runningBalance += item.amount
      } else if (item.approvalStatus === 'APPROVED') {
        // Only reduce balance for approved payments — matches party.balance in DB
        runningBalance -= item.amount
      }
      return { ...item, runningBalance }
    })

    return NextResponse.json({ entries: ledgerWithBalance, preFilterBalance })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
