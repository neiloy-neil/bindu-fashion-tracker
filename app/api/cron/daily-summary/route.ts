import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const entries = await prisma.dailyEntry.findMany({
    where: { date: { gte: today, lt: tomorrow } },
    include: {
      branch: true,
      items: { include: { category: true } },
      expenseEntries: true,
      transfers: true,
      payments: { include: { cheque: true } },
      advanceSalaries: true,
    }
  })

  let totalSales = 0
  let totalExpenses = 0

  const branchSummaries = entries.map(entry => {
    let branchSale = 0
    let branchExp = 0

    for (const item of entry.items) {
      if (item.category.type === 'INCOME') branchSale += item.amount
    }

    for (const e of entry.expenseEntries) {
      branchExp += e.amount
    }

    for (const t of entry.transfers) {
      branchExp += t.amount
    }

    for (const p of entry.payments) {
      if (p.method === 'CHEQUE' && p.cheque?.status !== 'APPROVED') continue
      branchExp += p.amount
    }

    for (const a of entry.advanceSalaries) {
      if (a.type === 'CASH') branchExp += a.amount || 0
    }

    totalSales += branchSale
    totalExpenses += branchExp

    return {
      branch: entry.branch.name,
      sales: branchSale,
      expenses: branchExp,
      net: branchSale - branchExp
    }
  })

  const summary = {
    date: today.toISOString().split('T')[0],
    totalSales,
    totalExpenses,
    netBalance: totalSales - totalExpenses,
    branchSummaries,
    message: 'Summary generated successfully'
  }

  logger.info('cron.daily_summary_generated', {
    date: summary.date,
    totalSales,
    totalExpenses,
    netBalance: summary.netBalance,
    branchCount: branchSummaries.length,
  })

  return NextResponse.json(summary)
}
