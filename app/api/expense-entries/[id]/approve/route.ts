import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

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
    const expense = await prisma.expenseEntry.findUnique({
      where: { id: parseInt(id) },
    })
    if (!expense) return NextResponse.json({ error: 'Expense entry not found' }, { status: 404 })
    if (expense.approvalStatus !== 'PENDING') {
      return NextResponse.json({ error: `Already ${expense.approvalStatus.toLowerCase()}` }, { status: 409 })
    }

    const updated = await prisma.expenseEntry.update({
      where: { id: expense.id },
      data: { approvalStatus: 'APPROVED', rejectionReason: null },
    })

    if (userId) {
      await logAudit({
        userId,
        action: 'UPDATE',
        entityType: 'ExpenseEntry',
        entityId: expense.id,
        oldValues: { approvalStatus: 'PENDING' },
        newValues: { approvalStatus: 'APPROVED' },
        reason: 'Expense approved by admin',
      })
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
