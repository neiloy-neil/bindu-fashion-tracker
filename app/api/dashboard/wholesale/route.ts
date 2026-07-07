import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  if (!['ADMIN', 'SUPER_ADMIN', 'ACCOUNTS', 'AUDITOR', 'AREA_MANAGER'].includes(role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const month = searchParams.get('month')
  const year = searchParams.get('year')

  let dateFilter: { gte: Date; lte: Date } | undefined

  if (startDate && endDate) {
    dateFilter = {
      gte: new Date(startDate + 'T00:00:00.000+06:00'),
      lte: new Date(endDate + 'T23:59:59.999+06:00'),
    }
  } else if (month && year) {
    const m = parseInt(month)
    const y = parseInt(year)
    const mm = String(m).padStart(2, '0')
    const lastDay = new Date(y, m, 0).getDate()
    dateFilter = {
      gte: new Date(`${y}-${mm}-01T00:00:00.000+06:00`),
      lte: new Date(`${y}-${mm}-${String(lastDay).padStart(2, '0')}T23:59:59.999+06:00`),
    }
  }

  const [challans, payments, buyers] = await Promise.all([
    prisma.wholesaleChallan.findMany({
      where: dateFilter ? { date: dateFilter } : undefined,
      select: { netAmount: true, remainingDue: true, paidAtDelivery: true, status: true, returns: { select: { amount: true } } },
    }),
    prisma.wholesalePayment.findMany({
      where: dateFilter ? { collectedAt: dateFilter } : undefined,
      select: { amount: true, method: true },
    }),
    // Outstanding balance is always all-time (current state), not date-filtered
    prisma.wholesaleBuyer.findMany({
      where: { isActive: true },
      select: { balance: true },
    }),
  ])

  const totalChallans = challans.length
  const totalNetAmount = challans.reduce((s, c) => s + c.netAmount - c.returns.reduce((r, ret) => r + ret.amount, 0), 0)
  const totalCollected = payments.reduce((s, p) => s + p.amount, 0)
  const totalOutstanding = buyers.reduce((s, b) => s + b.balance, 0)
  const activeBuyers = buyers.length
  const pendingChallans = challans.filter(c => c.status === 'PENDING' || c.status === 'PARTIALLY_PAID').length

  const methodBreakdown = payments.reduce<Record<string, number>>((acc, p) => {
    acc[p.method] = (acc[p.method] || 0) + p.amount
    return acc
  }, {})

  return NextResponse.json({
    totalChallans,
    totalNetAmount,
    totalCollected,
    totalOutstanding,
    activeBuyers,
    pendingChallans,
    methodBreakdown,
  })
}
