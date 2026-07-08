import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  const userRole = req.headers.get('x-user-role')
  
  if (!userRole || !['ADMIN', 'SUPER_ADMIN', 'ACCOUNTS', 'AUDITOR'].includes(userRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || undefined // PENDING, APPROVED, REJECTED

  try {
    const cheques = await prisma.cheque.findMany({
      where: status ? { status } : undefined,
      include: {
        payment: {
          include: {
            party: true,
            dailyEntry: {
              include: {
                branch: true
              }
            }
          }
        },
        approvedBy: {
          select: { username: true }
        }
      },
      orderBy: { withdrawDate: 'asc' }
    })

    return NextResponse.json(cheques)
  } catch (error) {
    logger.error('cheques.fetch_failed', error, { status: status ?? 'all' })
    return NextResponse.json({ error: 'Failed to fetch cheques' }, { status: 500 })
  }
}
