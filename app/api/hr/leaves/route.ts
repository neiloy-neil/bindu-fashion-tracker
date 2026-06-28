import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { sendEmail, leaveRequestEmail } from '@/lib/email'

const leaveSchema = z.object({
  employeeId: z.number(),
  startDate: z.string().pipe(z.coerce.date()),
  endDate: z.string().pipe(z.coerce.date()),
  type: z.enum(['SICK', 'CASUAL', 'UNPAID', 'ANNUAL', 'MARRIAGE']),
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
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.issues }, { status: 400 })
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

    // Notify HR admins and admins (fire-and-forget)
    void (async () => {
      try {
        const recipients = await prisma.user.findMany({
          where: { role: { in: ['ADMIN', 'HR_ADMIN'] }, isActive: true, email: { not: null } },
          select: { email: true }
        })
        const tpl = leaveRequestEmail(
          leave.employee.name,
          leave.type,
          leave.startDate.toISOString().split('T')[0],
          leave.endDate.toISOString().split('T')[0],
          leave.reason ?? null
        )
        await Promise.all(recipients.map(r => sendEmail({ to: r.email!, ...tpl })))
      } catch {}
    })()

    return NextResponse.json(leave, { status: 201 })
  } catch (error: any) {
    console.error('Create leave error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
