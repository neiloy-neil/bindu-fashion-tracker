import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getReqPerms, FORBIDDEN } from '@/lib/server-auth'

export async function GET(req: NextRequest) {
  const auth = await getReqPerms(req)
  if (!auth || !auth.perms['admin.audit']) return FORBIDDEN()
  const userRole = auth.role

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const action = searchParams.get('action') || ''
  const entityType = searchParams.get('entityType') || ''
  const userId = searchParams.get('userId') || ''

  try {
    const whereClause: any = {}
    if (action) whereClause.action = action
    if (entityType) whereClause.entityType = entityType
    if (userId) whereClause.userId = parseInt(userId)

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        include: { user: { select: { id: true, username: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where: whereClause })
    ])

    return NextResponse.json({ logs, total, page, limit })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
