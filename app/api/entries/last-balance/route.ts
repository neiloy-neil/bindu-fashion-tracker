import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeTotals } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const branchIdParam = searchParams.get('branchId')
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
    const lastEntry = await prisma.dailyEntry.findFirst({
      where: { branchId: finalBranchId },
      orderBy: { date: 'desc' },
      include: { items: { include: { category: true } } }
    })

    if (!lastEntry) {
      return NextResponse.json({ lastNetBalance: 0, lastEntry: null })
    }

    const { netBalance } = computeTotals(lastEntry)

    return NextResponse.json({ lastNetBalance: netBalance, lastEntry })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
