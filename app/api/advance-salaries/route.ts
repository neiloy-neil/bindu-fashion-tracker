import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { advanceSalaryMutationSchema } from '@/lib/schemas'

export async function POST(req: NextRequest) {
  const userRole = req.headers.get('x-user-role')
  const userBranchId = req.headers.get('x-user-branch-id')

  if (!userRole) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const parsed = advanceSalaryMutationSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 })
    }
    const { dailyEntryId, employeeId, type, amount, productDescription, note } = parsed.data

    // Verify branch ownership
    const entry = await prisma.dailyEntry.findUnique({ where: { id: dailyEntryId } })
    if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

    if (userRole === 'BRANCH' && String(entry.branchId) !== String(userBranchId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const advanceSalary = await prisma.advanceSalary.create({
      data: {
        dailyEntryId,
        employeeId,
        type,
        amount: type === 'CASH' ? amount ?? null : null,
        productDescription: type === 'PRODUCT' ? productDescription || null : null,
        note: note || null,
      }
    })

    return NextResponse.json(advanceSalary, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
