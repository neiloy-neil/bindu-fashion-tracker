import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'
import { notifyBranchUsers } from '@/lib/notify'

const bodySchema = z.object({
  reason: z.string().trim().min(1, 'Rejection reason is required').max(500),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userRole = req.headers.get('x-user-role')
  const userId = parseInt(req.headers.get('x-user-id') || '0')

  if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Rejection reason is required', details: parsed.error.flatten() }, { status: 400 })
    }

    const expense = await prisma.expenseEntry.findUnique({
      where: { id: parseInt(id) },
      include: { dailyEntry: { select: { branchId: true } } },
    })
    if (!expense) return NextResponse.json({ error: 'Expense entry not found' }, { status: 404 })
    if (expense.approvalStatus !== 'PENDING') {
      return NextResponse.json({ error: `Already ${expense.approvalStatus.toLowerCase()}` }, { status: 409 })
    }

    const updated = await prisma.expenseEntry.update({
      where: { id: expense.id },
      data: { approvalStatus: 'REJECTED', rejectionReason: parsed.data.reason },
    })

    if (userId) {
      await logAudit({
        userId,
        action: 'UPDATE',
        entityType: 'ExpenseEntry',
        entityId: expense.id,
        oldValues: { approvalStatus: 'PENDING' },
        newValues: { approvalStatus: 'REJECTED', rejectionReason: parsed.data.reason },
        reason: `Expense rejected: ${parsed.data.reason}`,
      })
    }

    if ((expense as any).dailyEntry?.branchId) {
      const branchId = (expense as any).dailyEntry.branchId
      void notifyBranchUsers(
        branchId,
        'EXPENSE_UPDATE',
        'Expense rejected',
        `An expense entry of ৳${expense.amount.toLocaleString('en-BD')} was rejected: ${parsed.data.reason}`,
        { expenseId: expense.id }
      ).catch(() => {})
      void (async () => {
        try {
          const areaManagers = await prisma.user.findMany({
            where: { role: 'AREA_MANAGER', isActive: true, managedBranches: { some: { id: branchId } } },
            select: { id: true },
          })
          if (areaManagers.length > 0) {
            await prisma.notification.createMany({
              data: areaManagers.map(u => ({
                userId: u.id,
                type: 'EXPENSE_UPDATE',
                title: 'Expense rejected',
                body: `An expense of ৳${expense.amount.toLocaleString('en-BD')} was rejected in a managed branch: ${parsed.data.reason}`,
                metadata: { expenseId: expense.id, branchId },
              })),
            })
          }
        } catch {}
      })()
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
