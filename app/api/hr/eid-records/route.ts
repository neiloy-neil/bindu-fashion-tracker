import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const eidRecordSchema = z.object({
  year: z.union([z.string(), z.number()]).transform(v => Number(v)),
  title: z.string().optional(),
  records: z.array(z.object({
    employeeId: z.number().int(),
    salaryPaymentPct: z.number().min(0).optional().default(0),
    hrAdvanceDeducted: z.number().min(0).optional().default(0),
    eidBonusPct: z.number().min(0).optional().default(0),
    title: z.string().optional(),
  })).min(1),
})

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  if (!role || !['ADMIN', 'SUPER_ADMIN', 'HR_ADMIN', 'AUDITOR'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const year = searchParams.get('year')
  const branchId = searchParams.get('branchId')

  if (!year) {
    return NextResponse.json({ error: 'year is required' }, { status: 400 })
  }

  try {
    const records = await prisma.eidRecord.findMany({
      where: {
        year: parseInt(year),
        ...(branchId ? { employee: { branchId: parseInt(branchId) } } : {})
      },
      include: {
        employee: true,
      },
      orderBy: { employee: { id: 'asc' } }
    })
    return NextResponse.json(records)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  if (!role || !['ADMIN', 'SUPER_ADMIN', 'HR_ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const parsed = eidRecordSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.issues }, { status: 400 })
    }
    const { year: y, title, records } = parsed.data

    const result = await prisma.$transaction(
      records.map((r) =>
        prisma.eidRecord.upsert({
          where: {
            employeeId_year_title: {
              employeeId: r.employeeId,
              year: y,
              title: title || r.title || `Eid Bonus ${y}`
            }
          },
          update: {
            title: title || r.title || `Eid Bonus ${y}`,
            salaryPaymentPct: r.salaryPaymentPct !== undefined ? r.salaryPaymentPct : undefined,
            hrAdvanceDeducted: r.hrAdvanceDeducted !== undefined ? r.hrAdvanceDeducted : undefined,
            eidBonusPct: r.eidBonusPct !== undefined ? r.eidBonusPct : undefined,
          },
          create: {
            employeeId: r.employeeId,
            year: y,
            title: title || r.title || `Eid Bonus ${y}`,
            salaryPaymentPct: r.salaryPaymentPct || 0,
            hrAdvanceDeducted: r.hrAdvanceDeducted || 0,
            eidBonusPct: r.eidBonusPct || 0,
          }
        })
      )
    )

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
