import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createExpenseEntrySchema = z.object({
  dailyEntryId: z.number().int().positive(),
  categoryId:   z.number().int().positive(),
  amount:       z.number().positive(),
  note:         z.string().max(500).optional().nullable(),
})

export async function GET(req: NextRequest) {
  const userRole = req.headers.get('x-user-role')
  if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') // PENDING | APPROVED | REJECTED

  try {
    const expenses = await prisma.expenseEntry.findMany({
      where: {
        isTransferEntry: false,
        ...(status ? { approvalStatus: status } : {}),
      },
      include: {
        category: { select: { name: true } },
        dailyEntry: {
          select: { id: true, date: true, branch: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json({ expenses })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const userRole = req.headers.get('x-user-role')
  const userBranchId = req.headers.get('x-user-branch-id')

  if (!userRole) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const parsed = createExpenseEntrySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { dailyEntryId, categoryId, amount, note } = parsed.data

    // Verify branch ownership
    const entry = await prisma.dailyEntry.findUnique({ where: { id: dailyEntryId } })
    if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

    if (userRole === 'BRANCH' && String(entry.branchId) !== String(userBranchId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const expenseEntry = await prisma.expenseEntry.create({
      data: {
        dailyEntryId: dailyEntryId,
        categoryId: categoryId,
        amount: amount,
        note: note,
      }
    })

    return NextResponse.json(expenseEntry, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
