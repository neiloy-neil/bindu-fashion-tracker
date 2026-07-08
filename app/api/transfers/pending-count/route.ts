import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { logger } from '@/lib/logger'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { role, branchId } = session.user

  try {
    const whereClause: Prisma.TransferWhereInput = { status: 'PENDING' }

    if (role === 'BRANCH') {
      if (!branchId) {
        return NextResponse.json({ count: 0 })
      }
      whereClause.account = { branchId }
    } else if (!['ADMIN', 'SUPER_ADMIN', 'ACCOUNTS', 'AUDITOR', 'AREA_MANAGER'].includes(role)) {
      return NextResponse.json({ count: 0 })
    }

    const count = await prisma.transfer.count({
      where: whereClause
    })

    return NextResponse.json({ count })
  } catch (error) {
    logger.error('Failed to fetch pending transfers count:', error)
    return NextResponse.json({ error: 'Failed to fetch count' }, { status: 500 })
  }
}
