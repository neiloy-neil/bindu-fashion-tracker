import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  if (!role || !['ADMIN', 'SUPER_ADMIN', 'AUDITOR', 'AREA_MANAGER'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const month = parseInt(searchParams.get('month') || '')
  const year = parseInt(searchParams.get('year') || '')
  const branchId = searchParams.get('branchId')

  if (isNaN(month) || isNaN(year)) {
    return NextResponse.json({ error: 'Invalid month or year' }, { status: 400 })
  }

  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59, 999)

  try {
    const bstStart = `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000+06:00`
    const lastDay = new Date(year, month, 0).getDate()
    const bstEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59.999+06:00`

    const [branches, entries, challans] = await Promise.all([
      prisma.branch.findMany({
        where: branchId ? { id: parseInt(branchId) } : {},
        select: { id: true, name: true },
      }),
      prisma.dailyEntry.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          ...(branchId ? { branchId: parseInt(branchId) } : {})
        },
        select: {
          branchId: true,
          // Income items — excludes Opening Balance and auto-booked Branch Transfer Received
          // (received transfers are counted separately via receivedTransfers relation to avoid double-counting)
          items: {
            where: { category: { type: 'INCOME', name: { notIn: ['Opening Balance', 'Branch Transfer Received'] } } },
            select: { amount: true },
          },
          // Cash received from other branches via inter-branch transfer acknowledgment
          receivedTransfers: { select: { amount: true } },
          expenseEntries: {
            where: { isTransferEntry: false },
            select: { amount: true, approvalStatus: true },
          },
          transfers: { select: { amount: true } },
          payments: { select: { amount: true, approvalStatus: true } },
          advanceSalaries: { select: { amount: true, type: true } },
        },
      }),
      prisma.wholesaleChallan.findMany({
        where: {
          date: { gte: new Date(bstStart), lte: new Date(bstEnd) },
          ...(branchId ? { branchId: parseInt(branchId) } : {}),
          status: { not: 'CANCELLED' },
        },
        select: {
          id: true, challanNumber: true, date: true, netAmount: true, remainingDue: true, status: true,
          branchId: true,
          buyer: { select: { name: true } },
          payments: { select: { amount: true } },
          returns: { select: { amount: true } },
        },
        orderBy: { date: 'asc' },
      }),
    ])

    // Group by branch
    const branchData = branches.map(b => {
      const branchEntries = entries.filter(e => e.branchId === b.id)

      let totalIncome = 0
      let totalReceivedTransfers = 0
      let totalExpense = 0
      let totalTransfers = 0
      let totalPayments = 0
      let totalAdvances = 0

      branchEntries.forEach(entry => {
        totalIncome += entry.items.reduce((sum, item) => sum + item.amount, 0)
        totalReceivedTransfers += entry.receivedTransfers.reduce((sum, t) => sum + t.amount, 0)
        // Only count approved expenses — pending/rejected are flagged separately
        totalExpense += entry.expenseEntries
          .filter(e => e.approvalStatus !== 'REJECTED')
          .reduce((sum, exp) => sum + exp.amount, 0)
        totalTransfers += entry.transfers.reduce((sum, tr) => sum + tr.amount, 0)
        // Only count approved payments; pending branch payments excluded until approved
        totalPayments += entry.payments
          .filter(p => p.approvalStatus === 'APPROVED')
          .reduce((sum, p) => sum + p.amount, 0)
        totalAdvances += entry.advanceSalaries
          .filter(a => a.type === 'CASH')
          .reduce((sum, a) => sum + (a.amount ?? 0), 0)
      })

      const grossIncome = totalIncome + totalReceivedTransfers

      const branchChallans = challans.filter(c => c.branchId === b.id)
      const wholesaleInvoiced = branchChallans.reduce((s, c) => s + c.netAmount - c.returns.reduce((r, ret) => r + ret.amount, 0), 0)
      const wholesaleCollected = branchChallans.reduce((s, c) => s + c.payments.reduce((r, p) => r + p.amount, 0), 0)
      const wholesaleOutstanding = branchChallans.reduce((s, c) => s + c.remainingDue, 0)

      return {
        branchId: b.id,
        branchName: b.name,
        totalIncome,
        totalReceivedTransfers,
        grossIncome,
        totalExpense,
        totalTransfers,
        totalPayments,
        totalAdvances,
        netCashFlow: grossIncome - totalExpense - totalTransfers - totalPayments - totalAdvances,
        wholesale: branchChallans.length > 0 ? {
          invoiced: wholesaleInvoiced,
          collected: wholesaleCollected,
          outstanding: wholesaleOutstanding,
          challans: branchChallans.map(c => ({
            challanNumber: c.challanNumber,
            buyerName: c.buyer.name,
            date: c.date.toISOString(),
            netAmount: c.netAmount - c.returns.reduce((r, ret) => r + ret.amount, 0),
            collected: c.payments.reduce((r, p) => r + p.amount, 0),
            remainingDue: c.remainingDue,
            status: c.status,
          })),
        } : null,
      }
    })

    return NextResponse.json(branchData)
  } catch (error: any) {
    logger.error('Monthly report error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
