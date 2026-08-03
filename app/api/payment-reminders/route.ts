import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const ALLOWED = ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTS', 'AREA_MANAGER', 'AUDITOR']

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role') ?? ''
  if (!ALLOWED.includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const reminders = await prisma.paymentReminder.findMany({
    where: { status: 'PENDING' },
    orderBy: { committedDate: 'asc' },
    include: {
      party: { select: { id: true, name: true } },
      committedBy: { select: { id: true, username: true } },
    },
  })
  return NextResponse.json(reminders)
}

export async function POST(req: NextRequest) {
  const role = req.headers.get('x-user-role') ?? ''
  const userId = parseInt(req.headers.get('x-user-id') ?? '0')
  if (!ALLOWED.includes(role) || !userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { partyId, committedDate, note } = await req.json()
  if (!partyId || !committedDate) {
    return NextResponse.json({ error: 'partyId and committedDate are required' }, { status: 400 })
  }

  const reminder = await prisma.paymentReminder.create({
    data: {
      partyId: parseInt(partyId),
      committedDate: new Date(committedDate),
      committedById: userId,
      note: note || null,
    },
    include: {
      party: { select: { id: true, name: true } },
      committedBy: { select: { id: true, username: true } },
    },
  })
  return NextResponse.json(reminder, { status: 201 })
}
