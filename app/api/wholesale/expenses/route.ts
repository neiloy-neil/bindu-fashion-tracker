import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { isMonthLocked } from '@/lib/locked-month'
import { getReqPerms, FORBIDDEN } from '@/lib/server-auth'

const schema = z.object({
  categoryId: z.number().int().positive(),
  amount: z.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(500).optional().nullable(),
})

// GET: list expenses for the branch (recent 60)
export async function GET(req: NextRequest) {
  const auth = await getReqPerms(req)
  if (!auth || !auth.perms['wholesale.view']) return FORBIDDEN()
  const { role: userRole } = auth
  const userBranchId = req.headers.get('x-user-branch-id')
  const branchType = req.headers.get('x-user-branch-type')

  const isWholesaleBranch = userRole === 'BRANCH' && branchType === 'WHOLESALE'
  const branchId = isWholesaleBranch ? parseInt(userBranchId ?? '0') : undefined

  const expenses = await prisma.expenseEntry.findMany({
    where: {
      isTransferEntry: false,
      ...(branchId ? { dailyEntry: { branchId } } : {}),
    },
    include: {
      category: { select: { name: true } },
      dailyEntry: { select: { date: true, branch: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 60,
  })

  return NextResponse.json({ expenses })
}

// POST: submit a standalone expense for a wholesale branch
export async function POST(req: NextRequest) {
  const auth = await getReqPerms(req)
  if (!auth || !auth.perms['wholesale.write']) return FORBIDDEN()
  const { role: userRole } = auth
  const userBranchId = req.headers.get('x-user-branch-id')
  const branchType = req.headers.get('x-user-branch-type')

  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole)
  const isWholesaleBranch = userRole === 'BRANCH' && branchType === 'WHOLESALE'

  if (!userBranchId) {
    return NextResponse.json({ error: 'Branch ID missing' }, { status: 400 })
  }

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { categoryId, amount, date, note } = parsed.data
  const branchId = parseInt(userBranchId)
  const entryDate = new Date(date + 'T00:00:00.000+06:00')

  if (!isAdmin && await isMonthLocked(branchId, entryDate)) {
    return NextResponse.json({ error: 'MONTH_LOCKED', message: 'This month is locked' }, { status: 403 })
  }

  // Find or create a DailyEntry for this branch+date (marked as wholesale placeholder)
  let dailyEntry = await prisma.dailyEntry.findFirst({
    where: { branchId, date: entryDate },
  })

  if (!dailyEntry) {
    dailyEntry = await prisma.dailyEntry.create({
      data: {
        branchId,
        date: entryDate,
        pettyCashOpening: 0,
        pettyCashUsed: 0,
        pettyCashReplenished: 0,
        pettyCashClosing: 0,
      },
    })
  }

  const expense = await prisma.expenseEntry.create({
    data: {
      dailyEntryId: dailyEntry.id,
      categoryId,
      amount,
      note: note ?? null,
      approvalStatus: 'PENDING',
    },
    include: { category: { select: { name: true } } },
  })

  return NextResponse.json(expense, { status: 201 })
}
