import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { dailyEntrySchema } from '@/lib/schemas'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') // 1-12
  const year = searchParams.get('year')
  const branchId = searchParams.get('branchId')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')

  console.log(`API /entries called: month=${month}, year=${year}, branchId=${branchId}, page=${page}`)

  const userRole = req.headers.get('x-user-role')
  const userBranchId = req.headers.get('x-user-branch-id')
  const userManagedBranches = req.headers.get('x-user-managed-branches')

  const where: Record<string, unknown> = {}

  if (year && month) {
    const y = parseInt(year)
    const m = parseInt(month)
    where.date = {
      gte: new Date(y, m - 1, 1),
      lt: new Date(y, m, 1),
    }
  }

  // Force branch filter based on role
  if (userRole === 'BRANCH') {
    if (!userBranchId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    where.branchId = parseInt(userBranchId)
  } else if (userRole === 'AREA_MANAGER') {
    if (!userManagedBranches) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const allowedBranchIds = userManagedBranches.split(',').map(id => parseInt(id))
    if (branchId) {
      if (!allowedBranchIds.includes(parseInt(branchId))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      where.branchId = parseInt(branchId)
    } else {
      where.branchId = { in: allowedBranchIds }
    }
  } else if (branchId) {
    where.branchId = parseInt(branchId)
  }

  const [entries, total] = await Promise.all([
    prisma.dailyEntry.findMany({
      where,
      include: { 
        branch: true,
        items: { include: { category: true } }
      },
      orderBy: [{ date: 'asc' }, { branchId: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.dailyEntry.count({ where }),
  ])

  return NextResponse.json({ entries, total, page, limit })
}

export async function POST(req: NextRequest) {
  const rawBody = await req.json()
  const parsed = dailyEntrySchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 })
  }
  const body = parsed.data
  const { date, branchId, notes, actualPhysicalCash, cashDifferenceNote, eodChecklist, items } = body

  const userRole = req.headers.get('x-user-role')
  const userBranchId = req.headers.get('x-user-branch-id')

  if (userRole === 'AUDITOR' || userRole === 'AREA_MANAGER') {
    return NextResponse.json({ error: 'Forbidden: Read-Only Role' }, { status: 403 })
  }

  let finalBranchId = typeof branchId === 'string' ? parseInt(branchId) : branchId

  if (userRole === 'BRANCH') {
    if (!userBranchId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    finalBranchId = parseInt(userBranchId)
  }

  try {
    const entry = await prisma.dailyEntry.create({
      data: {
        date: new Date(date),
        branchId: finalBranchId,
        notes,
        actualPhysicalCash,
        cashDifferenceNote,
        eodChecklist,
        items: items ? {
          create: items.map(item => ({
            categoryId: item.categoryId,
            amount: item.amount || 0,
            receiptUrls: item.receiptUrls || []
          }))
        } : undefined
      },
      include: { branch: true, items: { include: { category: true } } },
    })
    return NextResponse.json(entry, { status: 201 })
  } catch (error: unknown) {
    const e = error as { code?: string; message?: string }
    if (e.code === 'P2002') {
      return NextResponse.json(
        { error: 'Entry already exists for this date and branch' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
