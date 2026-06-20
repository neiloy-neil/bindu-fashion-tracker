import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { dailyEntrySchema } from '@/lib/schemas'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const rawBody = await req.json()
  const parsed = dailyEntrySchema.partial().safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 })
  }
  const body = parsed.data
  const { date, branchId, items, ...fields } = body

  const userRole = req.headers.get('x-user-role')
  if (userRole === 'AUDITOR' || userRole === 'AREA_MANAGER') {
    return NextResponse.json({ error: 'Forbidden: Read-Only Role' }, { status: 403 })
  }
  const userBranchId = req.headers.get('x-user-branch-id')

  try {
    // If branch user, verify they own this entry AND it's today's entry
    if (userRole === 'BRANCH') {
      if (!userBranchId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      const existing = await prisma.dailyEntry.findUnique({ where: { id: parseInt(id) } })
      if (!existing || existing.branchId !== parseInt(userBranchId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      
      const todayStr = new Date().toISOString().split('T')[0]
      const entryDateStr = existing.date.toISOString().split('T')[0]
      
      if (todayStr !== entryDateStr) {
        return NextResponse.json({ error: 'Past entries cannot be edited directly. Please submit an edit request.' }, { status: 403 })
      }
    }

    const entryIdNum = parseInt(id)

    // First update the entry itself
    const entry = await prisma.dailyEntry.update({
      where: { id: entryIdNum },
      data: {
        ...(date && { date: new Date(date) }),
        ...(branchId && userRole === 'ADMIN' && { branchId: typeof branchId === 'string' ? parseInt(branchId) : branchId }),
        ...fields,
      },
      include: { branch: true },
    })

    // Then upsert items if provided
    if (items) {
      for (const item of items) {
        await prisma.entryItem.upsert({
          where: {
            entryId_categoryId: {
              entryId: entryIdNum,
              categoryId: item.categoryId
            }
          },
          update: { amount: item.amount, receiptUrls: item.receiptUrls || [] },
          create: {
            entryId: entryIdNum,
            categoryId: item.categoryId,
            amount: item.amount || 0,
            receiptUrls: item.receiptUrls || []
          }
        })
      }
    }

    // Return the full updated entry
    const finalEntry = await prisma.dailyEntry.findUnique({
      where: { id: entryIdNum },
      include: { branch: true, items: { include: { category: true } } }
    })

    return NextResponse.json(finalEntry)
  } catch (error: unknown) {
    const e = error as { message?: string }
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userRole = _req.headers.get('x-user-role')
  if (userRole === 'AUDITOR' || userRole === 'AREA_MANAGER') {
    return NextResponse.json({ error: 'Forbidden: Read-Only Role' }, { status: 403 })
  }
  const userBranchId = _req.headers.get('x-user-branch-id')

  try {
    if (userRole === 'BRANCH') {
      if (!userBranchId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      const existing = await prisma.dailyEntry.findUnique({ where: { id: parseInt(id) } })
      if (!existing || existing.branchId !== parseInt(userBranchId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      
      const todayStr = new Date().toISOString().split('T')[0]
      const entryDateStr = existing.date.toISOString().split('T')[0]
      
      if (todayStr !== entryDateStr) {
        return NextResponse.json({ error: 'Past entries cannot be deleted.' }, { status: 403 })
      }
    }

    await prisma.dailyEntry.delete({ where: { id: parseInt(id) } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const e = error as { message?: string }
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
