import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { dateOnlyToUtc } from '@/lib/new-entry'
import { logger } from '@/lib/logger'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userRole = req.headers.get('x-user-role')
    if (!userRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const branchId = parseInt(id)
    if (isNaN(branchId)) return NextResponse.json({ error: 'Invalid branch ID' }, { status: 400 })

    if (userRole === 'BRANCH') {
      const userBranchId = req.headers.get('x-user-branch-id')
      if (!userBranchId || parseInt(userBranchId) !== branchId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const { searchParams } = new URL(req.url)
    const dateParam = searchParams.get('date')
    if (!dateParam) return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 })

    // Find the most recent entry for this branch strictly before the target date
    const lastEntry = await prisma.dailyEntry.findFirst({
      where: {
        branchId,
        date: {
          lt: dateOnlyToUtc(dateParam)
        }
      },
      orderBy: {
        date: 'desc'
      }
    })

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { pettyCashTarget: true, openingBalance: true },
    })

    const openingBalance = lastEntry
      ? (lastEntry.actualPhysicalCash ?? 0)
      : (branch?.openingBalance ?? 0)
    const pettyCashOpening = lastEntry?.pettyCashClosing ?? null

    // Check if today already has a stub entry with auto-booked incoming transfers
    const todayStub = await prisma.dailyEntry.findUnique({
      where: { date_branchId: { date: dateOnlyToUtc(dateParam), branchId } },
      select: {
        openingTime: true,
        items: { select: { amount: true, category: { select: { name: true } } } }
      }
    })
    const pendingTransferIncome = todayStub && todayStub.openingTime === null
      ? todayStub.items
          .filter(i => i.category.name === 'Branch Transfer Received')
          .reduce((s, i) => s + i.amount, 0)
      : 0

    return NextResponse.json({ openingBalance, pettyCashOpening, pettyCashTarget: branch?.pettyCashTarget ?? 0, isFirstEntry: !lastEntry, pendingTransferIncome })
  } catch (error: any) {
    logger.error('Error fetching last balance:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
