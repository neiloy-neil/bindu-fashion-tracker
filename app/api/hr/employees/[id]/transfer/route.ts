import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const transferSchema = z.object({
  toBranchId: z.union([z.string(), z.number()]).transform(v => Number(v)),
  reason: z.string().optional()
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userRole = req.headers.get('x-user-role')
  const userId = req.headers.get('x-user-id')

  if (!userRole || !['ADMIN', 'SUPER_ADMIN', 'HR_ADMIN'].includes(userRole)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'User ID missing in headers' }, { status: 401 })
  }

  try {
    const { id } = await params
    const employeeId = parseInt(id)
    if (isNaN(employeeId)) throw new Error('Invalid employee ID')

    const body = await req.json()
    const parsed = transferSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const { toBranchId, reason } = parsed.data

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
    if (!employee) throw new Error('Employee not found')

    if (!employee.branchId) {
      return NextResponse.json({ error: 'Employee is not assigned to any branch currently' }, { status: 400 })
    }

    if (employee.branchId === toBranchId) {
      return NextResponse.json({ error: 'Employee is already in the destination branch' }, { status: 400 })
    }

    // Wrap the transfer in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the transfer record
      const transfer = await tx.employeeTransfer.create({
        data: {
          employeeId: employee.id,
          fromBranchId: employee.branchId!,
          toBranchId,
          transferredById: parseInt(userId),
          reason
        }
      })

      // 2. Update employee's branch
      await tx.employee.update({
        where: { id: employee.id },
        data: { branchId: toBranchId }
      })

      return transfer
    })

    logger.info('employee.transferred', {
      employeeId: employee.id,
      fromBranchId: employee.branchId,
      toBranchId,
      transferredById: userId
    })

    return NextResponse.json({ success: true, transfer: result }, { status: 200 })

  } catch (error: any) {
    logger.error('employee.transfer_failed', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
