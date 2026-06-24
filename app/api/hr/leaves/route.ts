import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const leaveSchema = z.object({
  employeeId: z.number(),
  startDate: z.string().transform(v => new Date(v)),
  endDate: z.string().transform(v => new Date(v)),
  type: z.enum(['SICK', 'CASUAL', 'UNPAID', 'ANNUAL']),
  reason: z.string().optional()
})

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  if (!role || (role !== 'ADMIN' && role !== 'HR_ADMIN' && role !== 'AUDITOR' && role !== 'BRANCH')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')
  const year = searchParams.get('year')
  const branchId = searchParams.get('branchId')
  const status = searchParams.get('status')
  const employeeId = searchParams.get('employeeId')

  const where: any = {}

  if (month && year) {
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999)
    where.startDate = { lte: endDate }
    where.endDate = { gte: startDate }
  }

  if (branchId) {
    where.employee = { branchId: parseInt(branchId) }
  }
  
  if (employeeId) {
    where.employeeId = parseInt(employeeId)
  }

  if (status) {
    where.status = status
  }

  try {
    const leaves = await prisma.leaveRecord.findMany({
      where,
      include: {
        employee: {
          select: { id: true, name: true, branch: { select: { id: true, name: true } } }
        },
        approvedBy: { select: { id: true, username: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(leaves)
  } catch (error: any) {
    console.error('Fetch leaves error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const role = req.headers.get('x-user-role')
  if (!role || (role !== 'ADMIN' && role !== 'HR_ADMIN' && role !== 'BRANCH')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const rawBody = await req.json()
    const parsed = leaveSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
    }

    const leave = await prisma.leaveRecord.create({
      data: {
        ...parsed.data,
        status: 'PENDING'
      },
      include: {
        employee: { select: { name: true } }
      }
    })

    return NextResponse.json(leave, { status: 201 })
  } catch (error: any) {
    console.error('Create leave error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
