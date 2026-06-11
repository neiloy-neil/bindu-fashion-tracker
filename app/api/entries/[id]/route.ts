import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const { date, branchId, ...fields } = body

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

    const entry = await prisma.dailyEntry.update({
      where: { id: parseInt(id) },
      data: {
        ...(date && { date: new Date(date) }),
        ...(branchId && userRole === 'ADMIN' && { branchId: parseInt(branchId) }),
        ...fields,
      },
      include: { branch: true },
    })
    return NextResponse.json(entry)
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
    }

    await prisma.dailyEntry.delete({ where: { id: parseInt(id) } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const e = error as { message?: string }
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
