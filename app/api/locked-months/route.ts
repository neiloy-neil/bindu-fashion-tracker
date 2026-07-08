import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'

const lockSchema = z.object({
  branchId: z.number().int().positive(),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
})

export async function GET(req: NextRequest) {
  const userRole = req.headers.get('x-user-role')
  if (!['ADMIN', 'SUPER_ADMIN', 'AUDITOR', 'AREA_MANAGER', 'ACCOUNTS'].includes(userRole ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get('branchId')

  const locked = await prisma.lockedMonth.findMany({
    where: branchId ? { branchId: parseInt(branchId) } : undefined,
    include: { branch: { select: { name: true } }, lockedBy: { select: { username: true } } },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  })

  return NextResponse.json({ locked })
}

export async function POST(req: NextRequest) {
  const userRole = req.headers.get('x-user-role')
  const userId = req.headers.get('x-user-id')
  if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsed = lockSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { branchId, year, month } = parsed.data

  try {
    const locked = await prisma.lockedMonth.create({
      data: { branchId, year, month, lockedById: parseInt(userId!) },
    })
    void logAudit({ userId: parseInt(userId!), action: 'CREATE', entityType: 'LockedMonth', entityId: locked.id, newValues: { branchId, year, month } })
    return NextResponse.json({ locked }, { status: 201 })
  } catch (e: any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'This month is already locked' }, { status: 409 })
    }
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const userRole = req.headers.get('x-user-role')
  const userId = req.headers.get('x-user-id')
  if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsed = lockSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { branchId, year, month } = parsed.data

  const deleted = await prisma.lockedMonth.deleteMany({ where: { branchId, year, month } })
  if (deleted.count === 0) {
    return NextResponse.json({ error: 'Lock not found' }, { status: 404 })
  }

  void logAudit({ userId: parseInt(userId!), action: 'DELETE', entityType: 'LockedMonth', entityId: 0, newValues: { branchId, year, month } })
  return NextResponse.json({ success: true })
}
