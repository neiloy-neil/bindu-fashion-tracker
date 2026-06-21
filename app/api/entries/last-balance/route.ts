import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { dateOnlyToUtc } from '@/lib/new-entry'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const branchIdParam = searchParams.get('branchId')
  const dateParam = searchParams.get('date')
  const userRole = req.headers.get('x-user-role')
  const userBranchId = req.headers.get('x-user-branch-id')

  let finalBranchId: number

  if (userRole === 'BRANCH') {
    if (!userBranchId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    finalBranchId = parseInt(userBranchId)
  } else {
    if (!branchIdParam) {
      return NextResponse.json({ error: 'branchId is required' }, { status: 400 })
    }
    finalBranchId = parseInt(branchIdParam)
  }

  try {
    const whereClause = {
      branchId: finalBranchId,
      ...(dateParam ? { date: { lt: dateOnlyToUtc(dateParam) } } : {}),
    }

    const lastEntry = await prisma.dailyEntry.findFirst({
      where: whereClause,
      orderBy: { date: 'desc' }
    })

    if (!lastEntry) {
      return NextResponse.json({ lastNetBalance: 0, actualPhysicalCash: 0, lastEntry: null, userRole })
    }

    // We now rely on actualPhysicalCash from the previous day for Strict Cash Reconciliation
    return NextResponse.json({ 
      lastNetBalance: lastEntry.actualPhysicalCash || 0, // Fallback if old data
      actualPhysicalCash: lastEntry.actualPhysicalCash || 0,
      lastEntry,
      userRole
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load carryover'
    return NextResponse.json({ error: 'CARRYOVER_FAILED', message }, { status: 500 })
  }
}
