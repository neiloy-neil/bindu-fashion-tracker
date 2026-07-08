import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { notifyByRole } from '@/lib/notify'
import { logger } from '@/lib/logger'

// Default overdue threshold: 7 days. Override with ?days=N query param.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get('days') || '7')

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  cutoff.setHours(0, 0, 0, 0)

  try {
    const overdue = await prisma.wholesaleChallan.findMany({
      where: {
        status: { in: ['PENDING', 'PARTIALLY_PAID'] },
        remainingDue: { gt: 0 },
        date: { lte: cutoff },
      },
      select: {
        id: true,
        challanNumber: true,
        remainingDue: true,
        date: true,
        buyer: { select: { name: true } },
        branch: { select: { name: true } },
      },
      orderBy: { date: 'asc' },
    })

    if (overdue.length === 0) {
      return NextResponse.json({ notified: 0, message: 'No overdue challans found' })
    }

    const totalDue = overdue.reduce((s, c) => s + c.remainingDue, 0)
    const topBuyers = [...new Map(overdue.map(c => [c.buyer.name, c])).values()]
      .slice(0, 3)
      .map(c => c.buyer.name)
      .join(', ')

    const title = `${overdue.length} overdue challan${overdue.length !== 1 ? 's' : ''} (৳${Math.round(totalDue).toLocaleString()} due)`
    const body = `Outstanding for ${days}+ days — buyers: ${topBuyers}${overdue.length > 3 ? ` +${overdue.length - 3} more` : ''}`

    await notifyByRole(
      ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTS'],
      'PAYMENT_PENDING',
      title,
      body,
      { overdueCount: overdue.length, totalDue, days },
    )

    logger.info('cron.overdue_challans', { count: overdue.length, totalDue, days })
    return NextResponse.json({ notified: overdue.length, totalDue })
  } catch (error: any) {
    logger.error('cron.overdue_challans.failed', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
