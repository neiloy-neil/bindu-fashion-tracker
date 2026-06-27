import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const userRole = req.headers.get('x-user-role')
  const userBranchId = req.headers.get('x-user-branch-id')

  if (!userRole) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const entryWhere: any = {}
  const requestWhere: any = {}

  if (userRole === 'BRANCH' && userBranchId) {
    entryWhere.branchId = parseInt(userBranchId)
    requestWhere.entry = { branchId: parseInt(userBranchId) }
  } else if (userRole === 'BRANCH' && !userBranchId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const recentEntries = await prisma.dailyEntry.findMany({
    where: entryWhere,
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { branch: true },
  })

  const recentRequests = await prisma.editRequest.findMany({
    where: requestWhere,
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { entry: { include: { branch: true } } },
  })

  const activities = [
    ...recentEntries.map(e => ({
      id: `entry-${e.id}`,
      type: 'ENTRY_SUBMITTED',
      branchName: e.branch.name,
      date: e.createdAt,
      message: `${e.branch.name} submitted an entry for ${e.date.toISOString().split('T')[0]}`
    })),
    ...recentRequests.map((r: any) => ({
      id: `req-${r.id}`,
      type: 'EDIT_REQUEST',
      branchName: r.entry.branch.name,
      date: r.createdAt,
      message: `${r.entry.branch.name} requested an edit for ${r.entry.date.toISOString().split('T')[0]}`
    }))
  ]
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  .slice(0, 10)

  return NextResponse.json(activities)
}
