import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const ALLOWED = ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTS', 'AREA_MANAGER', 'AUDITOR']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = req.headers.get('x-user-role') ?? ''
  if (!ALLOWED.includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { status } = await req.json()
  if (!['DONE', 'CANCELLED'].includes(status)) {
    return NextResponse.json({ error: 'status must be DONE or CANCELLED' }, { status: 400 })
  }

  const reminder = await prisma.paymentReminder.update({
    where: { id: parseInt(id) },
    data: { status },
    include: {
      party: { select: { id: true, name: true } },
      committedBy: { select: { id: true, username: true } },
    },
  })
  return NextResponse.json(reminder)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = req.headers.get('x-user-role') ?? ''
  if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  await prisma.paymentReminder.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ ok: true })
}
