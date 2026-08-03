import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { getReqPerms, FORBIDDEN } from '@/lib/server-auth'

const transferSchema = z.object({
  toBranchId: z.union([z.string(), z.number()]).transform(v => Number(v)),
  reason: z.string().optional()
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getReqPerms(req)
  if (!auth || !auth.perms['hr.employees.write']) return FORBIDDEN()
  const userId = String(auth.userId)
  const userRole = auth.role


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
          transferredById: auth.userId,
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
