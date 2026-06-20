import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const userRole = req.headers.get('x-user-role')
  const userBranchId = req.headers.get('x-user-branch-id')

  if (!userRole) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get('branchId')
  const dateStr = searchParams.get('date')

  if (!branchId || !dateStr) {
    return NextResponse.json({ error: 'Missing branchId or date' }, { status: 400 })
  }

  const parsedBranchId = parseInt(branchId, 10)

  if (userRole === 'BRANCH' && String(parsedBranchId) !== String(userBranchId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const targetDate = new Date(dateStr)

    // Find the entry for this branch and date
    // Prisma date equality can be tricky if time is involved, but usually we store date strings as Date objects with 00:00:00
    // To be safe, we'll look for entries between start and end of that day.
    const startOfDay = new Date(targetDate)
    startOfDay.setUTCHours(0, 0, 0, 0)
    const endOfDay = new Date(targetDate)
    endOfDay.setUTCHours(23, 59, 59, 999)

    const entry = await prisma.dailyEntry.findFirst({
      where: {
        branchId: parsedBranchId,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        branch: true,
        items: {
          include: { category: true }
        },
        transfers: {
          include: { account: true }
        },
        payments: {
          include: { party: true, cheque: true }
        },
        expenseEntries: {
          include: { category: true }
        },
        advanceSalaries: {
          include: { employee: true }
        }
      }
    })

    if (!entry) {
      return NextResponse.json(null) // Empty state
    }

    return NextResponse.json(entry)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
