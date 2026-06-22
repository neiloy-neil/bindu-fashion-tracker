import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userRole = req.headers.get('x-user-role')
  const userIdStr = req.headers.get('x-user-id')
  
  if (!userRole || userRole !== 'ADMIN' || !userIdStr) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const userId = parseInt(userIdStr, 10)
  const resolvedParams = await params
  const id = parseInt(resolvedParams.id, 10)
  
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid cheque ID' }, { status: 400 })

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Fetch cheque and ensure it is PENDING
      const cheque = await tx.cheque.findUnique({
        where: { id },
        include: { payment: true }
      })

      if (!cheque) throw new Error('Cheque not found')
      if (cheque.status !== 'PENDING') throw new Error('Cheque is already processed')

      // Update Cheque Status
      const updatedCheque = await tx.cheque.update({
        where: { id },
        data: {
          status: 'REJECTED',
          approvedById: userId,
          approvedAt: new Date()
        }
      })

      // We do NOT decrement the Party balance here because the cheque bounced.

      return updatedCheque
    })

    await logAudit({
      userId,
      action: 'UPDATE',
      entityType: 'Cheque',
      entityId: id,
      newValues: result,
      reason: 'Cheque Rejected / Bounced'
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to reject cheque:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 })
  }
}
