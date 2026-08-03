import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getReqPerms, FORBIDDEN } from '@/lib/server-auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getReqPerms(req)
  if (!auth || !auth.perms['payroll.salary.process']) return FORBIDDEN()
  const { id } = await params;

  try {
    const recordId = parseInt(id)
    const existing = await prisma.salaryRecord.findUnique({ where: { id: recordId } })

    if (!existing) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    }

    if (existing.lockedAt) {
      return NextResponse.json({ error: 'This month\'s payroll has been finalized.' }, { status: 423 })
    }

    const data = await req.json()
    const updated = await prisma.salaryRecord.update({
      where: { id: recordId },
      data: {
        hrAdvanceDeducted: data.hrAdvanceDeducted !== undefined ? data.hrAdvanceDeducted : undefined,
        leaveDaysTaken: data.leaveDaysTaken !== undefined ? data.leaveDaysTaken : undefined,
        leaveAdjustment: data.leaveAdjustment !== undefined ? data.leaveAdjustment : undefined,
        lateDays: data.lateDays !== undefined ? data.lateDays : undefined,
        otDays: data.otDays !== undefined ? data.otDays : undefined,
        attendanceBonus: data.attendanceBonus !== undefined ? data.attendanceBonus : undefined,
        conveyanceOverride: data.conveyanceOverride !== undefined ? data.conveyanceOverride : undefined,
        notes: data.notes !== undefined ? data.notes : undefined,
      }
    })
    
    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getReqPerms(req)
  if (!auth || !auth.perms['payroll.salary.process']) return FORBIDDEN()
  const { id } = await params;

  try {
    const recordId = parseInt(id)
    const existing = await prisma.salaryRecord.findUnique({ where: { id: recordId } })

    if (!existing) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    }

    if (existing.lockedAt) {
      return NextResponse.json({ error: 'This month\'s payroll has been finalized.' }, { status: 423 })
    }

    await prisma.salaryRecord.delete({ where: { id: recordId } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
