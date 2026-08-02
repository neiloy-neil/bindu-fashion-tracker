import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role') ?? ''
  if (!['ADMIN', 'SUPER_ADMIN', 'ACCOUNTS', 'AUDITOR', 'AREA_MANAGER'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))
  const monthEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59))

  const [
    parties,
    monthPurchases,
    monthPayments,
    pendingPayments,
    recentPayments,
  ] = await Promise.all([
    prisma.party.findMany({
      select: { id: true, name: true, balance: true, isActive: true },
      orderBy: { balance: 'desc' },
    }),
    prisma.purchase.aggregate({
      where: { date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { approvalStatus: 'APPROVED', createdAt: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.payment.count({ where: { approvalStatus: 'PENDING' } }),
    prisma.payment.findMany({
      where: { approvalStatus: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true, amount: true, method: true, createdAt: true,
        party: { select: { id: true, name: true } },
        dailyEntry: { select: { branch: { select: { name: true } } } },
      },
    }),
  ])

  const totalParties = parties.length
  const activeParties = parties.filter(p => p.isActive).length
  const totalOutstanding = parties.reduce((s, p) => s + (p.balance > 0 ? p.balance : 0), 0)
  const clearedParties = parties.filter(p => p.balance <= 0).length
  const withDue = parties.filter(p => p.balance > 0).length
  const topDebtors = parties.filter(p => p.balance > 0).slice(0, 6)

  // Payment method breakdown (approved, this month)
  const methodBreakdownRows = await prisma.payment.groupBy({
    by: ['method'],
    where: { approvalStatus: 'APPROVED', createdAt: { gte: monthStart, lte: monthEnd } },
    _sum: { amount: true },
    _count: true,
  })

  return NextResponse.json({
    totalParties,
    activeParties,
    withDue,
    clearedParties,
    totalOutstanding,
    monthPurchases: monthPurchases._sum.amount ?? 0,
    monthPayments: monthPayments._sum.amount ?? 0,
    pendingPayments,
    topDebtors,
    recentPayments,
    methodBreakdown: methodBreakdownRows.map(r => ({
      method: r.method,
      amount: r._sum.amount ?? 0,
      count: r._count,
    })),
  })
}
