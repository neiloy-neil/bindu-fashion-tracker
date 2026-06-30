import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { sendEmail, dailySummaryEmail } from '@/lib/email'

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
      expenseEntries: { where: { isTransferEntry: false } },
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

  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true, email: { not: null } },
      select: { email: true }
    })
    
    if (admins.length > 0) {
      const emailContent = dailySummaryEmail(
        summary.date,
        summary.totalSales,
        summary.totalExpenses,
        summary.netBalance,
        summary.branchSummaries
      )
      
      await Promise.all(
        admins.map(admin => 
          sendEmail({
            to: admin.email!,
            subject: emailContent.subject,
            html: emailContent.html
          })
        )
      )
      logger.info('cron.daily_summary_email_sent', { count: admins.length })
    }
  } catch (error) {
    logger.error('cron.daily_summary_email_failed', error)
  }

  return NextResponse.json(summary)
}
