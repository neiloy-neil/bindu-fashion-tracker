import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'

const statusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'])
})

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const role = req.headers.get('x-user-role')
  const userId = req.headers.get('x-user-id')
  const userBranchId = req.headers.get('x-user-branch-id')

  if (!role || !['ADMIN', 'HR_ADMIN', 'BRANCH'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: paramId } = await context.params
  const id = parseInt(paramId)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  try {
    const rawBody = await req.json()
    const parsed = statusSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
    }

    const currentLeave = await prisma.leaveRecord.findUnique({ 
      where: { id },
      include: { employee: { select: { branchId: true } } }
    })
    if (!currentLeave) return NextResponse.json({ error: 'Leave not found' }, { status: 404 })

    if (role === 'BRANCH') {
      if (String(currentLeave.employee.branchId) !== String(userBranchId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const updated = await prisma.leaveRecord.update({
      where: { id },
      data: {
        status: parsed.data.status,
        approvedById: parseInt(userId || '0')
      }
    })

    if (userId) {
      await logAudit({
        userId: parseInt(userId),
        action: 'UPDATE',
        entityType: 'LeaveRecord',
        entityId: id,
        oldValues: currentLeave,
        newValues: updated,
        reason: `Leave ${parsed.data.status}`
      })
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Update leave error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
