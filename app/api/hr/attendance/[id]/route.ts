import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const excuseSchema = z.object({
  isExcused: z.boolean(),
  excuseNote: z.string().optional().nullable(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const role = req.headers.get('x-user-role')
    const userBranchId = req.headers.get('x-user-branch-id')

    if (!role || !['ADMIN', 'SUPER_ADMIN', 'HR_ADMIN', 'BRANCH'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: paramId } = await params
    const id = parseInt(paramId)
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    const parsed = excuseSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
    }

    const attendance = await prisma.attendance.findUnique({
      where: { id },
      include: { employee: true }
    })

    if (!attendance) return NextResponse.json({ error: 'Attendance not found' }, { status: 404 })

    if (role === 'BRANCH') {
      if (String(attendance.branchId) !== String(userBranchId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const updated = await prisma.attendance.update({
      where: { id },
      data: {
        isExcused: parsed.data.isExcused,
        excuseNote: parsed.data.excuseNote || null
      }
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    logger.error('Update attendance error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
