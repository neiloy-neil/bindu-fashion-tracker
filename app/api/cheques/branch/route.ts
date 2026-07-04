import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const userRole = req.headers.get('x-user-role')
  const userBranchId = req.headers.get('x-user-branch-id')

  if (userRole !== 'BRANCH' || !userBranchId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const branchId = parseInt(userBranchId, 10)

  try {
    const cheques = await prisma.cheque.findMany({
      where: {
        payment: {
          dailyEntry: { branchId },
        },
      },
      include: {
        payment: {
          select: {
            amount: true,
            party: { select: { name: true } },
            dailyEntry: { select: { date: true } },
          },
        },
      },
      orderBy: { withdrawDate: 'desc' },
      take: 50,
    })

    return NextResponse.json({ cheques })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
