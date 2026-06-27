import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userRole = req.headers.get('x-user-role')
  if (!userRole) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const resolvedParams = await params
  const id = parseInt(resolvedParams.id)

  try {
    const [purchases, payments] = await Promise.all([
      prisma.purchase.findMany({
        where: { partyId: id },
        orderBy: { date: 'asc' }
      }),
      prisma.payment.findMany({
        where: { partyId: id },
        include: { cheque: true, dailyEntry: { include: { branch: true } } },
        orderBy: { createdAt: 'asc' }
      })
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
        note: p.note,
        attachmentUrl: p.attachmentUrl,
        cheque: p.cheque,
        branch: p.dailyEntry?.branch,
        createdAt: p.createdAt
      })
    }

    // Sort by date asc
    ledger.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Calculate running balance
    let runningBalance = 0
    const ledgerWithBalance = ledger.map(item => {
      if (item.type === 'PURCHASE') {
        runningBalance += item.amount
      } else {
        runningBalance -= item.amount
      }
      return { ...item, runningBalance }
    })

    return NextResponse.json(ledgerWithBalance)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
