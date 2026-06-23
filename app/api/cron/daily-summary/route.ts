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
    where: {
      date: {
        gte: today,
        lt: tomorrow
      }
    },
    include: { branch: true }
  })

  let totalSales = 0
  let totalExpenses = 0

  const branchSummaries = entries.map(entry => {
    const incomeFields = [
      'cashSale', 'dueReceived', 'conditionRec', 'bkashIncome', 'nagadIncome',
      'rocketIncome', 'posPubali', 'posCity', 'posBrac', 'posDbbl',
      'acBindu', 'bindu2Transfer', 'receivedAziz1'
    ] as const

    const expenseFields = [
      'advanceTk', 'conditionChange', 'partyPayment', 'aziz2Transfer', 'bankDeposit',
      'dmcb', 'saleBonus', 'courierLbrBill', 'snacksTea', 'lunch', 'conveyance',
      'otherExpense', 'donation', 'stationary', 'netWife', 'utilities', 'waterBill',
      'dailySomity', 'electricRecharge', 'petrolMobil', 'phoneBill', 'shopRent',
      'salary', 'returnExp', 'bkashExpense', 'nagadExpense', 'posExpense',
      'rocketDbbl', 'bossPersonalAll', 'acBinduExpense', 'vat', 'vatExp',
      'emgFund', 'bossGift'
    ] as const

    const branchSale = incomeFields.reduce((s, f) => s + (entry[f as keyof typeof entry] as number || 0), 0)
    const branchExp = expenseFields.reduce((s, f) => s + (entry[f as keyof typeof entry] as number || 0), 0)

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

  // TODO: Send email or WhatsApp here.
  // Example with Resend:
  // await resend.emails.send({ ... })
  logger.info('cron.daily_summary_generated', {
    date: summary.date,
    totalSales,
    totalExpenses,
    netBalance: summary.netBalance,
    branchCount: branchSummaries.length,
  })

  return NextResponse.json(summary)
}
