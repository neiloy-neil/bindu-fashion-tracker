import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const userRole = req.headers.get('x-user-role')
  const userBranchId = req.headers.get('x-user-branch-id')

  if (!userRole) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const { dailyEntryId, categoryId, amount, note } = await req.json()

    // Verify branch ownership
    const entry = await prisma.dailyEntry.findUnique({ where: { id: parseInt(dailyEntryId) } })
    if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

    if (userRole === 'BRANCH' && String(entry.branchId) !== String(userBranchId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const expenseEntry = await prisma.expenseEntry.create({
      data: {
        dailyEntryId: parseInt(dailyEntryId),
        categoryId: parseInt(categoryId),
        amount: parseFloat(amount),
        note,
      }
    })

    return NextResponse.json(expenseEntry, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
