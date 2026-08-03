import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function dateOnly(str: string): Date {
  const d = new Date(str)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = req.headers.get('x-user-role')
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const holidays = await prisma.branchHoliday.findMany({
    where: { branchId: parseInt(id) },
    orderBy: { date: 'asc' },
  })
  return NextResponse.json(holidays)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = req.headers.get('x-user-role')
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const branchId = parseInt(id)
  const { date, name, note } = await req.json()

  if (!date || !name?.trim()) {
    return NextResponse.json({ error: 'Date and name are required' }, { status: 400 })
  }

  try {
    const holiday = await prisma.branchHoliday.create({
      data: { branchId, date: dateOnly(date), name: name.trim(), note: note?.trim() || null },
    })
    return NextResponse.json(holiday, { status: 201 })
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ error: 'A holiday already exists on this date' }, { status: 409 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
