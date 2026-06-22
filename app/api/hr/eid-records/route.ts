import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  if (!role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
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
  if (!role || (role !== 'ADMIN' && role !== 'HR_ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { year, title, records } = await req.json()
    
    if (!year || !Array.isArray(records)) {
      return NextResponse.json({ error: 'Invalid payload. year, and records array required.' }, { status: 400 })
    }

    const y = parseInt(year)

    const result = await prisma.$transaction(
      records.map((r: any) => 
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
            advanceDeducted: r.advanceDeducted !== undefined ? r.advanceDeducted : undefined,
            eidBonusPct: r.eidBonusPct !== undefined ? r.eidBonusPct : undefined,
            notes: r.notes !== undefined ? r.notes : undefined,
          },
          create: {
            employeeId: r.employeeId,
            year: y,
            title: title || r.title || `Eid Bonus ${y}`,
            salaryPaymentPct: r.salaryPaymentPct || 0,
            advanceDeducted: r.advanceDeducted || 0,
            eidBonusPct: r.eidBonusPct || 0,
            notes: r.notes || '',
          }
        })
      )
    )

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
